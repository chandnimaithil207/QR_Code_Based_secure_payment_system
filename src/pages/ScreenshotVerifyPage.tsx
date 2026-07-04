import { useState, useRef } from 'react';
import { Upload, ScanLine, CheckCircle2, XCircle, FileImage, Hash, DollarSign, User, Loader2, Wand2, Camera } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { OCRResult } from '../types';

export default function ScreenshotVerifyPage() {
  const [image, setImage] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [submittedAmount, setSubmittedAmount] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImage(ev.target?.result as string);
      setOcrResult(null);
      setError(null);
      setTransactionId('');
      setSubmittedAmount('');
    };
    reader.readAsDataURL(file);
  };

  const preprocessImage = (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Scale up image for better OCR (2x)
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Increase contrast and convert to grayscale
        ctx.filter = 'contrast(1.5) grayscale(100%)';
        ctx.drawImage(canvas, 0, 0);

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imageDataUrl;
    });
  };

  const handleAutoExtract = async () => {
    if (!image) return;

    setAnalyzing(true);
    setOcrProgress('Preparing image...');
    setError(null);

    try {
      const Tesseract = await import('tesseract.js');

      setOcrProgress('Loading OCR engine...');

      // Preprocess image for better accuracy
      const processedImage = await preprocessImage(image);

      // Create worker with correct v7 API
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m: { status: string; progress?: number }) => {
          if (m.status === 'recognizing text' && m.progress) {
            setOcrProgress(`Analyzing: ${Math.round(m.progress * 100)}%`);
          } else if (m.status === 'loading language traineddata') {
            setOcrProgress('Loading language model...');
          } else if (m.status === 'initializing tesseract') {
            setOcrProgress('Initializing OCR...');
          }
        },
      });


      setOcrProgress('Reading text from image...');

      const { data: { text } } = await worker.recognize(processedImage);
      await worker.terminate();

      console.log('OCR extracted text:', text);

      setOcrProgress('Extracting transaction details...');

      // More flexible patterns for Transaction ID
      const txnPatterns = [
        /TXN[-\s]?\d{4,10}/i,
        /Transaction\s*(?:ID|No\.?|#)[:\s]*([A-Z0-9][\w-]{4,20})/i,
        /TXN([A-Z0-9-]{4,10})/i,
        /#[A-Z0-9]{5,10}/i,
        /ID[:\s]*([A-Z0-9-]{5,15})/i,
      ];

      let foundTxn = '';
      for (const pattern of txnPatterns) {
        const match = text.match(pattern);
        if (match) {
          foundTxn = match[0].replace(/^(Transaction\s*(?:ID|No\.?|#)[:\s]*|ID[:\s]*)/i, '').replace(/\s/g, '').toUpperCase();
          break;
        }
      }

      if (foundTxn) {
        setTransactionId(foundTxn);
      }

      // More flexible patterns for Amount
      const amountPatterns = [
        /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
        /Amount[:\s]*\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        /Total[:\s]*\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        /Paid[:\s]*\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
        /(\d{1,3}(?:,\d{3})?\.\d{2})\s*(?:USD|INR)?/i,
      ];

      let foundAmount = '';
      for (const pattern of amountPatterns) {
        const match = text.match(pattern);
        if (match) {
          foundAmount = match[1].replace(/,/g, '');
          if (parseFloat(foundAmount) > 0) {
            setSubmittedAmount(`$${foundAmount}`);
            break;
          }
        }
      }

      setOcrProgress(null);

      if (!foundTxn && !foundAmount) {
        setError('Could not find Transaction ID or amount. Please enter manually.');
      } else if (!foundTxn) {
        setError('Could not find Transaction ID. Please enter manually.');
      } else if (!foundAmount) {
        setError('Could not find amount. Please enter manually.');
      }
    } catch (err) {
      console.error('OCR error:', err);
      setError('OCR failed. Please enter the details manually.');
      setOcrProgress(null);
    }

    setAnalyzing(false);
  };

  const handleVerify = async () => {
    setError(null);
    setOcrResult(null);

    if (!transactionId.trim()) { setError('Enter the Transaction ID.'); return; }
    if (!submittedAmount.trim()) { setError('Enter the amount.'); return; }

    setAnalyzing(true);

    const cleanAmount = submittedAmount.replace(/[$,\s]/g, '');
    const parsedAmount = parseFloat(cleanAmount);

    const { data: tx, error: lookupError } = await supabase
      .from('transactions')
      .select('transaction_id, amount, customer_name, status, created_at')
      .eq('transaction_id', transactionId.trim())
      .maybeSingle();

    const matched = !!tx && !isNaN(parsedAmount) && Math.abs(Number(tx.amount) - parsedAmount) < 0.01 && tx.status === 'verified';

    await supabase.from('screenshot_verifications').insert({
      transaction_id: transactionId.trim(),
      submitted_amount: submittedAmount.trim(),
      matched,
      customer_name: tx?.customer_name ?? null,
    });

    setAnalyzing(false);

    if (lookupError) { setError('Could not reach the verification service.'); return; }

    if (!tx) {
      setOcrResult({
        transactionId: transactionId.trim(),
        amount: submittedAmount.trim(),
        date: new Date().toLocaleDateString('en-US'),
        customerName: null,
        verified: false,
      });
      return;
    }

    const amountMatches = !isNaN(parsedAmount) && Math.abs(Number(tx.amount) - parsedAmount) < 0.01;

    setOcrResult({
      transactionId: tx.transaction_id,
      amount: Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      date: new Date(tx.created_at).toLocaleString('en-US'),
      customerName: tx.customer_name,
      verified: amountMatches && tx.status === 'verified',
    });
  };

  const handleReset = () => {
    setImage(null);
    setTransactionId('');
    setSubmittedAmount('');
    setOcrResult(null);
    setAnalyzing(false);
    setError(null);
    setOcrProgress(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Screenshot Verify</h1>
        <p className="text-sm text-gray-400 mt-1 font-mono">Upload or scan customer's payment receipt</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface-900 border border-surface-600 rounded-xl p-5 lg:p-6 card-glow">
          <div className="flex items-center gap-2 mb-5">
            <Upload className="w-4 h-4 text-cyber-blue" />
            <span className="text-xs font-mono text-cyber-blue uppercase tracking-widest">Receipt Screenshot</span>
          </div>

          {!image ? (
            <div className="space-y-3">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-surface-600 rounded-xl p-10 text-center cursor-pointer hover:border-cyber-blue hover:bg-surface-800/50 transition-all duration-300"
              >
                <FileImage className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Click to upload receipt image</p>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </div>
              <button
                onClick={() => cameraRef.current?.click()}
                className="w-full bg-surface-800 border border-surface-600 rounded-lg py-3 text-sm text-gray-300 hover:text-white hover:border-cyber-blue transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Scan with Camera
              </button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-surface-700">
                <img src={image} alt="Receipt screenshot" className="w-full max-h-64 object-contain bg-surface-800" />
                {analyzing && (
                  <div className="absolute inset-0 bg-cyber-blue/10 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-cyber-blue animate-spin mx-auto mb-2" />
                      <p className="text-xs text-cyber-blue font-mono">{ocrProgress}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setOcrResult(null); setError(null); fileRef.current?.click(); }}
                  className="flex-1 px-4 py-2 bg-surface-800 border border-surface-600 text-gray-400 rounded-lg text-xs hover:text-white hover:border-surface-500 transition-all"
                >
                  Change Image
                </button>
                <button
                  onClick={() => { setOcrResult(null); setError(null); cameraRef.current?.click(); }}
                  className="flex-1 px-4 py-2 bg-surface-800 border border-surface-600 text-gray-400 rounded-lg text-xs hover:text-white hover:border-cyber-blue transition-all flex items-center justify-center gap-1"
                >
                  <Camera className="w-3 h-3" />
                  Camera
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />
            </div>
          )}

          {image && (
            <div className="space-y-4 mt-5 pt-5 border-t border-surface-700">
              <button
                onClick={handleAutoExtract}
                disabled={analyzing}
                className="w-full bg-fuchsia-500/15 border border-fuchsia-500/40 text-fuchsia-400 font-semibold py-2.5 rounded-lg text-sm hover:bg-fuchsia-500/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Wand2 className="w-4 h-4" />
                {analyzing ? 'Processing...' : 'Auto-Extract from Image'}
              </button>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Transaction ID</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                    placeholder="TXN-XXXXX"
                    className="w-full bg-surface-800 border border-surface-600 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue focus:ring-2 focus:ring-cyber-blue/30 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Amount Paid</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={submittedAmount}
                    onChange={e => setSubmittedAmount(e.target.value)}
                    placeholder="$0.00"
                    className="w-full bg-surface-800 border border-surface-600 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue focus:ring-2 focus:ring-cyber-blue/30 transition-all font-mono"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-cyber-red/15 border border-cyber-red/50 text-cyber-red text-xs px-3 py-2 rounded-lg">
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!ocrResult ? (
                <button
                  onClick={handleVerify}
                  disabled={analyzing}
                  className="w-full bg-cyber-blue/15 border border-cyber-blue/40 text-cyber-blue font-semibold py-2.5 rounded-lg text-sm hover:bg-cyber-blue/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ScanLine className="w-4 h-4" />
                  Verify Transaction
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  className="w-full bg-surface-700 hover:bg-surface-600 text-white font-medium py-2.5 rounded-lg text-sm transition-all duration-200"
                >
                  Verify Another
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-surface-900 border border-surface-600 rounded-xl p-5 lg:p-6 card-glow">
          <div className="flex items-center gap-2 mb-5">
            <ScanLine className="w-4 h-4 text-cyber-green" />
            <span className="text-xs font-mono text-cyber-green uppercase tracking-widest">Verification Result</span>
          </div>

          {ocrResult ? (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <div className="p-3 bg-surface-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-cyber-blue" />
                    <span className="text-xs text-gray-400">Transaction ID</span>
                  </div>
                  <span className="text-sm font-mono text-cyber-blue">{ocrResult.transactionId}</span>
                </div>
                <div className="p-3 bg-surface-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-cyber-green" />
                    <span className="text-xs text-gray-400">Amount (server)</span>
                  </div>
                  <span className="text-sm font-mono text-white">${ocrResult.amount}</span>
                </div>
                <div className="p-3 bg-surface-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-400">Customer Name</span>
                  </div>
                  <span className="text-sm text-white">{ocrResult.customerName ?? '—'}</span>
                </div>
                <div className="p-3 bg-surface-800 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-gray-400">Payment Date</span>
                  <span className="text-xs font-mono text-gray-300">{ocrResult.date}</span>
                </div>
              </div>

              <div className={`rounded-xl p-5 text-center border ${
                ocrResult.verified
                  ? 'border-cyber-green/50 bg-cyber-green/15 glow-green'
                  : 'border-cyber-red/50 bg-cyber-red/15 glow-red'
              }`}>
                {ocrResult.verified ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-cyber-green mx-auto mb-2" />
                    <h3 className="text-lg font-bold text-cyber-green">Payment Verified</h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      Transaction ID and amount match server records
                    </p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-10 h-10 text-cyber-red mx-auto mb-2" />
                    <h3 className="text-lg font-bold text-cyber-red">Mismatch Detected</h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      {!ocrResult.customerName
                        ? 'Transaction ID not found in server records'
                        : 'Amount does not match the server record'}
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : analyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-2 border-cyber-blue/30 border-t-cyber-blue rounded-full animate-spin mb-4" />
              <p className="text-sm text-cyber-blue font-mono">Verifying...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-600 space-y-2">
              <ScanLine className="w-12 h-12 opacity-30" />
              <p className="text-sm text-gray-400">Results will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
