import { useState, useRef } from 'react';
import { Upload, ScanLine, CheckCircle2, XCircle, FileImage, Hash, DollarSign, User, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { OCRResult } from '../types';

export default function ScreenshotVerifyPage() {
  const [image, setImage] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [submittedAmount, setSubmittedAmount] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImage(ev.target?.result as string);
      setOcrResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = async () => {
    setError(null);
    setOcrResult(null);

    if (!transactionId.trim()) { setError('Enter the Transaction ID from the customer\'s screenshot.'); return; }
    if (!submittedAmount.trim()) { setError('Enter the amount shown on the screenshot.'); return; }
    if (!image) { setError('Upload the customer\'s payment receipt screenshot first.'); return; }

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
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Screenshot Verify</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">Upload the customer's payment receipt to verify it</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload + inputs */}
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Upload className="w-4 h-4 text-cyber-blue" />
            <span className="text-xs font-mono text-cyber-blue uppercase tracking-widest">Customer's Receipt Screenshot</span>
          </div>

          {!image ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-surface-600 rounded-xl p-10 text-center cursor-pointer hover:border-cyber-blue/40 hover:bg-surface-800/50 transition-all duration-300"
            >
              <FileImage className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 mb-1">Upload customer's payment receipt</p>
              <p className="text-xs text-gray-600 font-mono">The screenshot they sent you after paying</p>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-surface-700">
                <img src={image} alt="Receipt screenshot" className="w-full max-h-64 object-contain bg-surface-800" />
                {analyzing && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-x-0 h-0.5 bg-cyber-blue/60 animate-scan-line" />
                    <div className="absolute inset-0 bg-cyber-blue/5" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setOcrResult(null); fileRef.current?.click(); }}
                  className="px-4 py-2 bg-surface-800 border border-surface-600 text-gray-400 rounded-lg text-xs hover:text-white hover:border-surface-500 transition-all"
                >
                  Change Image
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </div>
            </div>
          )}

          {image && (
            <div className="space-y-4 mt-5 pt-5 border-t border-surface-700">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Transaction ID <span className="text-gray-600">(read from the screenshot)</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                    placeholder="TXN-XXXXX"
                    className="w-full bg-surface-800 border border-surface-600 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/30 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Amount Paid <span className="text-gray-600">(read from the screenshot)</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={submittedAmount}
                    onChange={e => setSubmittedAmount(e.target.value)}
                    placeholder="$0.00"
                    className="w-full bg-surface-800 border border-surface-600 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/30 transition-all font-mono"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red text-xs font-mono px-3 py-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!ocrResult ? (
                <button
                  onClick={handleVerify}
                  disabled={analyzing}
                  className="w-full bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue font-semibold py-2.5 rounded-lg text-sm hover:bg-cyber-blue/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {analyzing
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</>
                    : <><ScanLine className="w-4 h-4" />Verify Against Server Records</>
                  }
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  className="w-full bg-surface-700 hover:bg-surface-600 text-white font-medium py-2.5 rounded-lg text-sm transition-all duration-200"
                >
                  Verify Another Screenshot
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-5">
            <ScanLine className="w-4 h-4 text-cyber-green" />
            <span className="text-xs font-mono text-cyber-green uppercase tracking-widest">Server Verification Result</span>
          </div>

          {ocrResult ? (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Record from Server</h3>
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
                  ? 'border-cyber-green/30 bg-cyber-green/5 glow-green'
                  : 'border-cyber-red/30 bg-cyber-red/5 glow-red'
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
              <p className="text-sm text-cyber-blue font-mono">Querying server records...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-600 space-y-2">
              <ScanLine className="w-12 h-12 opacity-30" />
              <p className="text-sm">Results will appear here</p>
              <p className="text-xs font-mono text-gray-700 text-center max-w-xs">
                Upload the receipt, enter the Transaction ID and amount from it, then verify
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
