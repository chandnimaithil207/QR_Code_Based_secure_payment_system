import { useState, useRef } from 'react';
import QrScanner from 'qr-scanner';
import { CreditCard, CheckCircle2, Hash, DollarSign, User, Loader2, AlertCircle, XCircle, ScanLine, ArrowRight, Upload, Image as ImageIcon } from 'lucide-react';
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

function checkExpiry(expiryTime: string): boolean {
  // Parse "HH:MM:SS AM/PM" generated client-side (toLocaleTimeString en-US) back to a Date today.
  const today = new Date();
  const m = expiryTime.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return false;
  let hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  const seconds = parseInt(m[3], 10);
  if (m[4]) {
    const ampm = m[4].toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
  }
  const expiry = new Date();
  expiry.setHours(hours, minutes, seconds, 0);
  return today.getTime() <= expiry.getTime();
}

function generateTransactionId(): string {
  return `TXN-${Math.floor(90000 + Math.random() * 9999)}`;
}

export default function CustomerPaymentPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [phase, setPhase] = useState<Phase>('entry');
  const [rejectReason, setRejectReason] = useState<RejectReason | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleScanQrImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setDecoding(true);
    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      const decoded = result.data.trim();
      if (!decoded.startsWith('TKN-')) {
        setError('That image does not contain a valid SecureQR payment token.');
        setDecoding(false);
        return;
      }
      setTokenInput(decoded);
      // Auto-continue with the decoded token.
      await loadByToken(decoded);
    } catch (err) {
      console.error('QR decode failed', err);
      setError('Could not read a QR code from that image. Try typing the token instead.');
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
      .select('id, order_id, token, merchant_name, amount, expiry_time, used')
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

    if (!checkExpiry(data.expiry_time)) {
      await logFraud(token, 'Expired QR', `Payment attempted after QR expiry (${data.expiry_time})`);
      setRejectReason('expired');
      setPhase('rejected');
      return;
    }

    setQrData({
      orderId: data.order_id,
      token: data.token,
      merchantName: data.merchant_name,
      amount: Number(data.amount),
      expiryTime: data.expiry_time,
      used: data.used,
    });
    setPhase('paying');
  };

  const logFraud = async (
    token: string,
    fraudType: string,
    description: string,
  ): Promise<void> => {
    // We don't know the merchant at this point; find the qr_code by token to attach
    // the merchant's user_id so RLS lets the insert land in their fraud board.
    const { data: qr } = await supabase
      .from('qr_codes')
      .select('user_id')
      .eq('token', token)
      .maybeSingle();

    if (!qr) {
      // No matching merchant — nothing to log against a real record.
      return;
    }

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
      order_id: qrData.orderId,
      amount: qrData.amount,
      status: 'verified',
      customer_name: customerName.trim(),
    });

    if (txError) {
      setError('Payment could not be processed. Please try again.');
      return;
    }

    // Mark QR as used so it can't be replayed.
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
  };

  return (
    <div className="min-h-screen bg-surface-950 grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyber-green/10 border border-cyber-green/30 mb-3">
            <ScanLine className="w-6 h-6 text-cyber-green" />
          </div>
          <h1 className="text-xl font-bold text-white">SecureQR Payment</h1>
          <p className="text-xs text-gray-500 mt-1 font-mono">No login required — just enter your token and pay</p>
        </div>

        <div className="bg-surface-900 border border-surface-700 rounded-xl p-6 space-y-4">
          {/* Phase: entry — token input */}
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
                  Paste your token, or upload the QR image to scan it.
                </p>
              </div>

              <div className="relative">
                <input ref={fileRef} type="file" accept="image/*" onChange={handleScanQrImage} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={decoding}
                  className="w-full bg-surface-800 hover:bg-surface-700 border border-surface-600 text-gray-300 hover:text-white py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {decoding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning QR...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" />
                      Scan QR from Image
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red text-xs font-mono px-3 py-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={() => loadByToken()}
                disabled={phase !== 'entry'}
                className="w-full bg-cyber-green hover:bg-cyber-green-dark text-surface-950 font-semibold py-3 rounded-lg text-sm transition-all duration-200 hover:shadow-lg hover:shadow-cyber-green/20 flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Phase: loading */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="w-8 h-8 border-2 border-cyber-green/30 border-t-cyber-green rounded-full animate-spin mb-3" />
              <p className="text-sm text-cyber-green font-mono">Verifying token...</p>
            </div>
          )}

          {/* Phase: paying — show details, ask for name, pay */}
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

          {/* Phase: success */}
          {phase === 'success' && result && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyber-green/10 border border-cyber-green/30 mb-4">
                <CheckCircle2 className="w-8 h-8 text-cyber-green" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Payment Successful</h2>
              <p className="text-xs text-gray-500 font-mono mb-5">Save your transaction ID as your receipt</p>

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
                  <span className="text-xs text-gray-400">Amount</span>
                  <span className="text-sm font-mono text-cyber-green">
                    ${result.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <span className="text-xs text-gray-400">Customer</span>
                  <span className="text-sm text-white">{result.customerName}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <span className="text-xs text-gray-400">Date</span>
                  <span className="text-xs font-mono text-gray-300">{result.date}</span>
                </div>
              </div>

              <p className="text-xs text-cyber-blue font-mono mb-4 px-3 py-2 bg-cyber-blue/5 border border-cyber-blue/20 rounded-lg">
                Share your Transaction ID with the merchant for screenshot verification.
              </p>

              <button
                onClick={reset}
                className="w-full bg-surface-700 hover:bg-surface-600 text-white font-medium py-2.5 rounded-lg text-sm transition-all duration-200"
              >
                Done
              </button>
            </div>
          )}

          {/* Phase: rejected */}
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
                {rejectReason === 'invalid' && 'The token you entered does not exist or is malformed.'}
                {rejectReason === 'expired' && 'Please ask the merchant for a fresh QR code.'}
                {rejectReason === 'used' && 'A QR code can only be used once for your security.'}
                {rejectReason === 'fraud' && 'This payment was flagged by the fraud monitoring system.'}
              </p>

              <div className="bg-cyber-red/5 border border-cyber-red/20 rounded-lg p-3 mb-5 text-left">
                <p className="text-xs text-gray-500 font-mono">
                  This attempt has been logged for fraud monitoring.
                </p>
              </div>

              <button
                onClick={reset}
                className="w-full bg-surface-700 hover:bg-surface-600 text-white font-medium py-2.5 rounded-lg text-sm transition-all duration-200"
              >
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
