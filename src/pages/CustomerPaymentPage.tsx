import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Upload, CreditCard, CheckCircle2, Hash, DollarSign, User, FileUp, ScanLine } from 'lucide-react';
import { generateOrderId, generateToken, generateTransactionId } from '../lib/mockData';
import type { QRData } from '../types';

export default function CustomerPaymentPage() {
  const [mode, setMode] = useState<'scan' | 'demo'>('demo');
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [paid, setPaid] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDemoQR = () => {
    setQrData({
      orderId: generateOrderId(),
      token: generateToken(),
      merchantName: 'TechZone Electronics',
      amount: 2499.99,
      expiryTime: '14:45:00',
    });
    setPaid(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScanning(true);
      setTimeout(() => {
        handleDemoQR();
        setScanning(false);
      }, 1200);
    }
  };

  const handlePay = () => {
    const txId = generateTransactionId();
    setTransactionId(txId);
    setPaid(true);
  };

  const handleReset = () => {
    setQrData(null);
    setPaid(false);
    setTransactionId('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Customer Payment</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">Scan or upload QR to initiate secure payment</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Upload / Scan Section */}
        {!qrData && !paid && (
          <div className="bg-surface-900 border border-surface-700 rounded-xl p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-5">
              <ScanLine className="w-4 h-4 text-cyber-blue" />
              <span className="text-xs font-mono text-cyber-blue uppercase tracking-widest">Scan QR Code</span>
            </div>

            {/* Upload area */}
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-surface-600 rounded-xl p-8 text-center cursor-pointer hover:border-cyber-blue/40 hover:bg-surface-800/50 transition-all duration-300"
            >
              {scanning ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 border-2 border-cyber-blue/30 border-t-cyber-blue rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-cyber-blue font-mono">Scanning QR code...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <FileUp className="w-10 h-10 text-gray-600 mx-auto" />
                  <p className="text-sm text-gray-400">Click to upload QR screenshot</p>
                  <p className="text-xs text-gray-600 font-mono">PNG, JPG supported</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-surface-700" />
              <span className="text-xs text-gray-600 font-mono">OR</span>
              <div className="flex-1 h-px bg-surface-700" />
            </div>

            <button
              onClick={handleDemoQR}
              className="w-full bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue font-semibold py-2.5 rounded-lg text-sm hover:bg-cyber-blue/20 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Load Demo QR Code
            </button>
          </div>
        )}

        {/* QR Display + Payment */}
        {qrData && !paid && (
          <div className="bg-surface-900 border border-surface-700 rounded-xl p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-5">
              <CreditCard className="w-4 h-4 text-cyber-green" />
              <span className="text-xs font-mono text-cyber-green uppercase tracking-widest">Payment Details</span>
            </div>

            <div className="text-center mb-6">
              <div className="inline-block p-3 bg-white rounded-xl">
                <QRCodeSVG
                  value={JSON.stringify(qrData)}
                  size={140}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#0a0a0f"
                />
              </div>
            </div>

            <div className="space-y-3 mb-6">
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
                  <span className="text-xs text-gray-400">Amount</span>
                </div>
                <span className="text-lg font-bold text-cyber-green font-mono">${qrData.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-cyber-blue" />
                  <span className="text-xs text-gray-400">Order ID</span>
                </div>
                <span className="text-sm font-mono text-cyber-blue">{qrData.orderId}</span>
              </div>
            </div>

            <button
              onClick={handlePay}
              className="w-full bg-cyber-green hover:bg-cyber-green-dark text-surface-950 font-semibold py-3 rounded-lg text-sm transition-all duration-200 hover:shadow-lg hover:shadow-cyber-green/20 flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Pay Now - ${qrData.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </button>
          </div>
        )}

        {/* Success Card */}
        {paid && qrData && (
          <div className="bg-surface-900 border border-cyber-green/30 rounded-xl p-6 lg:p-8 glow-green text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyber-green/10 border border-cyber-green/30 mb-4">
              <CheckCircle2 className="w-8 h-8 text-cyber-green" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Payment Successful</h2>
            <p className="text-sm text-gray-500 font-mono mb-6">Transaction verified and recorded</p>

            <div className="space-y-3 text-left mb-6">
              <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                <span className="text-xs text-gray-400">Transaction ID</span>
                <span className="text-sm font-mono text-cyber-blue">{transactionId}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                <span className="text-xs text-gray-400">Amount</span>
                <span className="text-sm font-mono text-cyber-green">${qrData.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                <span className="text-xs text-gray-400">Status</span>
                <span className="text-sm font-semibold text-cyber-green">Verified</span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full bg-surface-700 hover:bg-surface-600 text-white font-medium py-2.5 rounded-lg text-sm transition-all duration-200"
            >
              Make Another Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
