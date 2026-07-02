import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle2, Hash, DollarSign, User, Loader2, AlertCircle, XCircle, ScanLine, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { QRData } from '../types';

type Phase = 'entry' | 'loading' | 'paying' | 'success' | 'rejected';
type RejectReason = 'invalid' | 'expired' | 'used' | 'fraud';

interface PaymentResult {
  transactionId: string;
  merchantName: string;
  amount: number;
  orderId: string;
  customerName: string;
  date: string;
}

async function decodeQRFromFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);

  if ('BarcodeDetector' in window) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
    const barcodes = await detector.detect(bitmap);
    if (barcodes.length > 0) return barcodes[0].rawValue as string;
    throw new Error('No QR code found in image.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (!(window as any).__jsQR) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load QR decoder.'));
      document.head.appendChild(s);
    });
  }
  const jsQR = (window as any).jsQR as (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  if (!code) throw new Error('No QR code found in image.');
  return code.data;
}

function generateTransactionId(): string {
  return `TXN-${Math.floor(90000 + Math.random() * 9999)}`;
}

export default function CustomerPaymentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tokenInput, setTokenInput] = useState('');
  const [phase, setPhase] = useState<Phase>('entry');
  const [rejectReason, setRejectReason] = useState<RejectReason | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [merchantUserId, setMerchantUserId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-load token from URL parameter
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl && tokenFromUrl.startsWith('TKN-') && phase === 'entry' && !tokenInput) {
      setTokenInput(tokenFromUrl);
      loadByToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleScanQrImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setDecoding(true);
    try {
      const decoded = (await decodeQRFromFile(file)).trim();
      if (!decoded.startsWith('TKN-')) {
        setError('That image does not contain a valid SecureQR payment token.');
        return;
      }
      setTokenInput(decoded);
      await loadByToken(decoded);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('No QR code found')) {
        setError('No QR code detected in that image. Try a clearer photo or type the token.');
      } else if (msg.includes('Failed to load')) {
        setError('QR decoder could not load. Check your internet or type the token.');
      } else {
        setError('Could not read a QR code. Try typing the token instead.');
      }
    } finally {
      setDecoding(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const loadByToken = async (override?: string) => {
    setError(null);
    setRejectReason(null);
    const token = (override ?? tokenInput).trim();
    if (!token) {
      setError('Please enter your payment token.');
      return;
    }

    setPhase('loading');
    const { data, error: lookupError } = await supabase
      .from('qr_codes')
      .select('id, order_id, token, merchant_name, amount, expires_at, used, user_id')
      .eq('token', token)
      .maybeSingle();

    if (lookupError) {
      setError('Could not reach the payment service. Please try again.');
      setPhase('entry');
      return;
    }

    if (!data) {
      await logFraud(token, 'Invalid Token', 'Unknown payment token submitted');
      setRejectReason('invalid');
      setPhase('rejected');
      return;
    }

    if (data.used) {
      await logFraud(token, 'Duplicate Payment', 'Payment attempted on an already-used QR code');
      setRejectReason('used');
      setPhase('rejected');
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      await logFraud(token, 'Expired QR', `Payment attempted after QR expiry (${new Date(data.expires_at).toLocaleString()})`);
      setRejectReason('expired');
      setPhase('rejected');
      return;
    }

    setQrData({
      id: data.id,
      orderId: data.order_id,
      token: data.token,
      merchantName: data.merchant_name,
      amount: Number(data.amount),
      expiryTime: data.expires_at,
      used: data.used,
    });
    setMerchantUserId(data.user_id);
    setPhase('paying');
  };

  const logFraud = async (token: string, fraudType: string, description: string): Promise<void> => {
    const { data: qr } = await supabase
      .from('qr_codes')
      .select('user_id')
      .eq('token', token)
      .maybeSingle();
    if (!qr) return;
    await supabase.from('fraud_logs').insert({
      transaction_id: token,
      fraud_type: fraudType,
      description,
      user_id: qr.user_id,
    });
  };

  const handlePay = async () => {
    if (!qrData) return;
    if (!customerName.trim()) {
      setError('Please enter your name to continue.');
      return;
    }

    const txId = generateTransactionId();
    const { error: txError } = await supabase.from('transactions').insert({
      transaction_id: txId,
      qr_code_id: qrData.id,
      order_id: qrData.orderId,
      amount: qrData.amount,
      status: 'verified',
      customer_name: customerName.trim(),
      user_id: merchantUserId,
    });

    if (txError) {
      setError('Payment could not be processed. Please try again.');
      return;
    }

    await supabase.from('qr_codes').update({ used: true }).eq('token', qrData.token);

    setResult({
      transactionId: txId,
      merchantName: qrData.merchantName,
      amount: qrData.amount,
      orderId: qrData.orderId,
      customerName: customerName.trim(),
      date: new Date().toLocaleString('en-US'),
    });
    setPhase('success');
  };

  const reset = () => {
    setTokenInput('');
    setQrData(null);
    setCustomerName('');
    setResult(null);
    setRejectReason(null);
    setError(null);
    setPhase('entry');
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-surface-950 grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyber-green/10 border border-cyber-green/30 mb-3">
            <ScanLine className="w-6 h-6 text-cyber-green" />
          </div>
          <h1 className="text-xl font-bold text-white">SecureQR Payment</h1>
          <p className="text-xs text-gray-500 mt-1 font-mono">No login required — scan QR or paste token to pay</p>
        </div>

        <div className="bg-surface-900 border border-surface-700 rounded-xl p-6 space-y-4">
          {phase === 'entry' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Payment Token</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadByToken()}
                    placeholder="TKN-XXXXXXXXXXXXXXXX"
                    className="w-full bg-surface-800 border border-surface-600 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyber-green/50 focus:ring-1 focus:ring-cyber-green/30 transition-all font-mono"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2 font-mono">
                  Paste the token your merchant gave you, or upload the QR image.
                </p>
              </div>

              <input ref={fileRef} type="file" accept="image/*" onChange={handleScanQrImage} className="hidden" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={decoding}
                className="w-full bg-surface-800 hover:bg-surface-700 border border-surface-600 text-gray-300 hover:text-white py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {decoding
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Scanning QR...</>
                  : <><ImageIcon className="w-4 h-4" />Scan QR from Image</>
                }
              </button>

              {error && (
                <div className="flex items-start gap-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red text-xs font-mono px-3 py-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={() => loadByToken()}
                className="w-full bg-cyber-green hover:bg-cyber-green-dark text-surface-950 font-semibold py-3 rounded-lg text-sm transition-all duration-200 hover:shadow-lg hover:shadow-cyber-green/20 flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="w-8 h-8 border-2 border-cyber-green/30 border-t-cyber-green rounded-full animate-spin mb-3" />
              <p className="text-sm text-cyber-green font-mono">Verifying token...</p>
            </div>
          )}

          {phase === 'paying' && qrData && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-400">Merchant</span>
                  </div>
                  <span className="text-sm text-white font-medium">{qrData.merchantName}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-cyber-green" />
                    <span className="text-xs text-gray-400">Amount Due</span>
                  </div>
                  <span className="text-lg font-bold text-cyber-green font-mono">
                    ${qrData.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-cyber-blue" />
                    <span className="text-xs text-gray-400">Order ID</span>
                  </div>
                  <span className="text-sm font-mono text-cyber-blue">{qrData.orderId}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-surface-800 border border-surface-600 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyber-green/50 focus:ring-1 focus:ring-cyber-green/30 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red text-xs font-mono px-3 py-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handlePay}
                className="w-full bg-cyber-green hover:bg-cyber-green-dark text-surface-950 font-semibold py-3 rounded-lg text-sm transition-all duration-200 hover:shadow-lg hover:shadow-cyber-green/20 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Pay Now — ${qrData.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </button>
            </>
          )}

          {phase === 'success' && result && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyber-green/10 border border-cyber-green/30 mb-4">
                <CheckCircle2 className="w-8 h-8 text-cyber-green" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Payment Successful!</h2>
              <p className="text-xs text-gray-500 font-mono mb-5">
                Take a screenshot of this screen and share it with the merchant as your payment receipt.
              </p>

              <div className="space-y-3 text-left mb-5">
                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <span className="text-xs text-gray-400">Transaction ID</span>
                  <span className="text-sm font-mono text-cyber-blue">{result.transactionId}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <span className="text-xs text-gray-400">Merchant</span>
                  <span className="text-sm text-white">{result.merchantName}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <span className="text-xs text-gray-400">Amount Paid</span>
                  <span className="text-sm font-mono text-cyber-green">
                    ${result.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <span className="text-xs text-gray-400">Customer Name</span>
                  <span className="text-sm text-white">{result.customerName}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <span className="text-xs text-gray-400">Date & Time</span>
                  <span className="text-xs font-mono text-gray-300">{result.date}</span>
                </div>
              </div>

              <div className="bg-cyber-blue/5 border border-cyber-blue/20 rounded-lg p-3 mb-5 text-left">
                <p className="text-xs text-cyber-blue font-mono font-semibold mb-1">Next step for you:</p>
                <p className="text-xs text-gray-400 font-mono">
                  Screenshot this page and send it to your merchant. They will verify it using the Transaction ID shown above.
                </p>
              </div>

              <button onClick={reset} className="w-full bg-surface-700 hover:bg-surface-600 text-white font-medium py-2.5 rounded-lg text-sm transition-all duration-200">
                Done
              </button>
            </div>
          )}

          {phase === 'rejected' && rejectReason && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyber-red/10 border border-cyber-red/30 mb-4">
                <XCircle className="w-8 h-8 text-cyber-red" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                {rejectReason === 'invalid' && 'Invalid Token'}
                {rejectReason === 'expired' && 'QR Code Expired'}
                {rejectReason === 'used' && 'QR Code Already Used'}
                {rejectReason === 'fraud' && 'Payment Rejected'}
              </h2>
              <p className="text-xs text-gray-500 font-mono mb-5">
                {rejectReason === 'invalid' && 'This token does not exist. Check you copied it correctly.'}
                {rejectReason === 'expired' && 'This QR has expired. Ask your merchant to generate a new one.'}
                {rejectReason === 'used' && 'This QR has already been paid. Each QR can only be used once.'}
                {rejectReason === 'fraud' && 'This payment was flagged by the fraud monitoring system.'}
              </p>
              <div className="bg-cyber-red/5 border border-cyber-red/20 rounded-lg p-3 mb-5 text-left">
                <p className="text-xs text-gray-500 font-mono">This attempt has been logged for the merchant's fraud monitor.</p>
              </div>
              <button onClick={reset} className="w-full bg-surface-700 hover:bg-surface-600 text-white font-medium py-2.5 rounded-lg text-sm transition-all duration-200">
                Try Another Token
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-700 mt-4 font-mono">
          Powered by SecureQR — token-based payment verification
        </p>
      </div>
    </div>
  );
}
