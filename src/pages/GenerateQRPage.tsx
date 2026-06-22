import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Copy, Check, Clock, Hash, User, DollarSign, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

interface GeneratedQR {
  id: string;
  orderId: string;
  token: string;
  merchantName: string;
  amount: number;
  expiresAt: string; // full ISO timestamp
}

function generateOrderId(): string {
  return `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return `TKN-${result}`;
}

export default function GenerateQRPage() {
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState('15');
  const [qrData, setQrData] = useState<GeneratedQR | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const { userEmail } = useAuth();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    const parsedMinutes = parseInt(expiryMinutes, 10);
    if (!merchantName.trim()) { setError('Merchant name is required.'); return; }
    if (!parsedAmount || parsedAmount <= 0) { setError('A positive amount is required.'); return; }
    if (!parsedMinutes || parsedMinutes < 1) { setError('Expiry must be at least 1 minute.'); return; }

    const orderId = generateOrderId();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + parsedMinutes * 60 * 1000).toISOString();

    setLoading(true);
    const { data, error: insertError } = await supabase
      .from('qr_codes')
      .insert({
        order_id: orderId,
        token,
        merchant_name: merchantName.trim(),
        amount: parsedAmount,
        expiry_time: expiresAt,
        expires_at: expiresAt,
      })
      .select('id')
      .single();
    setLoading(false);

    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to generate QR code.');
      return;
    }

    setQrData({ id: data.id, orderId, token, merchantName: merchantName.trim(), amount: parsedAmount, expiresAt });
  };

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg || !qrData) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      const link = document.createElement('a');
      link.download = `secureqr-${qrData.orderId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleCopyToken = () => {
    if (qrData?.token) {
      navigator.clipboard.writeText(qrData.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const customerPaymentUrl = `${window.location.origin}/customer-payment`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Generate QR Code</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">Create a secure payment QR — share the token or QR image with your customer</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-5">
            <QrCode className="w-4 h-4 text-cyber-green" />
            <span className="text-xs font-mono text-cyber-green uppercase tracking-widest">Configuration</span>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Merchant Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={merchantName}
                  onChange={e => setMerchantName(e.target.value)}
                  placeholder="Your business or your name"
                  className="w-full bg-surface-800 border border-surface-600 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyber-green/50 focus:ring-1 focus:ring-cyber-green/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Amount ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-surface-800 border border-surface-600 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyber-green/50 focus:ring-1 focus:ring-cyber-green/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Expires In (minutes)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={expiryMinutes}
                  onChange={e => setExpiryMinutes(e.target.value)}
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
              type="submit"
              disabled={loading}
              className="w-full bg-cyber-green hover:bg-cyber-green-dark text-surface-950 font-semibold py-2.5 rounded-lg text-sm transition-all duration-200 hover:shadow-lg hover:shadow-cyber-green/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><QrCode className="w-4 h-4" />Generate QR Code</>}
            </button>
          </form>

          {/* How it works */}
          <div className="mt-5 pt-5 border-t border-surface-700 space-y-2">
            <p className="text-xs font-medium text-gray-400">How the flow works</p>
            <ol className="space-y-1.5">
              {[
                'Generate QR → share token or QR image with customer',
                'Customer opens /customer-payment, scans or pastes token',
                'Customer clicks Pay Now → gets a receipt with Transaction ID',
                'Customer screenshots their receipt and shares it with you',
                'You go to Screenshot Verify → upload their receipt + enter the Transaction ID shown on it',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-500 font-mono">
                  <span className="text-cyber-green shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {userEmail && (
            <p className="text-xs text-gray-600 mt-4 font-mono">
              Logged in as <span className="text-gray-400">{userEmail}</span>
            </p>
          )}
        </div>

        {/* QR Preview */}
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-5">
            <QrCode className="w-4 h-4 text-cyber-blue" />
            <span className="text-xs font-mono text-cyber-blue uppercase tracking-widest">Preview</span>
          </div>

          {qrData ? (
            <div className="text-center">
              <div ref={qrRef} className="inline-block p-4 bg-white rounded-xl mb-4">
                <QRCodeSVG value={qrData.token} size={180} level="H" bgColor="#ffffff" fgColor="#0a0a0f" />
              </div>

              <div className="space-y-2.5 text-left mt-4">
                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-cyber-blue" />
                    <span className="text-xs text-gray-400">Order ID</span>
                  </div>
                  <span className="text-sm font-mono text-cyber-blue">{qrData.orderId}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-cyber-green" />
                    <span className="text-xs text-gray-400">Token</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyber-green truncate max-w-[130px]">{qrData.token}</span>
                    <button onClick={handleCopyToken} className="text-gray-500 hover:text-white transition-colors shrink-0">
                      {copied ? <Check className="w-3.5 h-3.5 text-cyber-green" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-cyber-green" />
                    <span className="text-xs text-gray-400">Amount</span>
                  </div>
                  <span className="text-sm font-mono text-cyber-green">
                    ${qrData.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-cyber-yellow" />
                    <span className="text-xs text-gray-400">Expires At</span>
                  </div>
                  <span className="text-xs font-mono text-cyber-yellow">
                    {new Date(qrData.expiresAt).toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-cyber-green/5 border border-cyber-green/20 rounded-lg text-left">
                <p className="text-xs text-gray-400 font-mono mb-1">Customer payment link:</p>
                <a
                  href={customerPaymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyber-blue font-mono hover:underline flex items-center gap-1 break-all"
                >
                  {customerPaymentUrl}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>

              <button
                onClick={handleDownload}
                className="mt-4 w-full bg-surface-700 hover:bg-surface-600 text-white font-medium py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download QR Image
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-600">
              <QrCode className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Fill the form and generate</p>
              <p className="text-xs mt-1 font-mono text-gray-700">QR will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
