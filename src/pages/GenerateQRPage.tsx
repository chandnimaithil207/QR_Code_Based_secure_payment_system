import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Copy, Check, Clock, Hash, User, DollarSign } from 'lucide-react';
import { generateOrderId, generateToken, getExpiryTime } from '../lib/mockData';
import type { QRData } from '../types';

export default function GenerateQRPage() {
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState('');
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const orderId = generateOrderId();
    const token = generateToken();
    setQrData({
      orderId,
      token,
      merchantName: merchantName || 'Demo Merchant',
      amount: parseFloat(amount) || 100.00,
      expiryTime: getExpiryTime(15),
    });
  };

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      if (ctx) {
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      const link = document.createElement('a');
      link.download = `secureqr-${qrData?.orderId || 'code'}.png`;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Generate QR Code</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">Create a secure payment QR with server-side token validation</p>
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
                  placeholder="Enter merchant name"
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

            <button
              type="submit"
              className="w-full bg-cyber-green hover:bg-cyber-green-dark text-surface-950 font-semibold py-2.5 rounded-lg text-sm transition-all duration-200 hover:shadow-lg hover:shadow-cyber-green/20 flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Generate QR Code
            </button>
          </form>
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
                <QRCodeSVG
                  value={JSON.stringify(qrData)}
                  size={180}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#0a0a0f"
                />
              </div>

              <div className="space-y-3 text-left mt-4">
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
                    <span className="text-xs font-mono text-cyber-green truncate max-w-[140px]">{qrData.token}</span>
                    <button onClick={handleCopyToken} className="text-gray-500 hover:text-white transition-colors">
                      {copied ? <Check className="w-3.5 h-3.5 text-cyber-green" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-cyber-yellow" />
                    <span className="text-xs text-gray-400">Expires At</span>
                  </div>
                  <span className="text-sm font-mono text-cyber-yellow">{qrData.expiryTime}</span>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="mt-4 w-full bg-surface-700 hover:bg-surface-600 text-white font-medium py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download QR Code
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-600">
              <QrCode className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Fill the form and generate a QR code</p>
              <p className="text-xs mt-1 font-mono text-gray-700">QR will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
