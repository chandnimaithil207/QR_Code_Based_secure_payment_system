import { useState, useRef } from 'react';
import { Upload, ScanLine, CheckCircle2, XCircle, FileImage, Eye } from 'lucide-react';
import type { OCRResult } from '../types';

const mockOCRResults: OCRResult[] = [
  { transactionId: 'TXN-90123', amount: '2,500.00', date: '2026-06-16', verified: true },
  { transactionId: 'TXN-90121', amount: '4,200.00', date: '2026-06-16', verified: false },
];

export default function ScreenshotVerifyPage() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        setOcrResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const result = mockOCRResults[Math.random() > 0.5 ? 0 : 1];
      setOcrResult(result);
      setAnalyzing(false);
    }, 2000);
  };

  const handleReset = () => {
    setImage(null);
    setOcrResult(null);
    setAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Screenshot Verification</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">OCR-based screenshot analysis for fraud detection</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Upload className="w-4 h-4 text-cyber-blue" />
            <span className="text-xs font-mono text-cyber-blue uppercase tracking-widest">Upload Screenshot</span>
          </div>

          {!image ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-surface-600 rounded-xl p-10 text-center cursor-pointer hover:border-cyber-blue/40 hover:bg-surface-800/50 transition-all duration-300"
            >
              <FileImage className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 mb-1">Click to upload payment screenshot</p>
              <p className="text-xs text-gray-600 font-mono">PNG, JPG up to 5MB</p>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-surface-700">
                <img src={image} alt="Screenshot" className="w-full max-h-64 object-contain bg-surface-800" />
                {/* Scan line animation */}
                {analyzing && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-x-0 h-0.5 bg-cyber-blue/60 animate-scan-line" />
                    <div className="absolute inset-0 bg-cyber-blue/5" />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!ocrResult ? (
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="flex-1 bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue font-semibold py-2.5 rounded-lg text-sm hover:bg-cyber-blue/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {analyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-cyber-blue/30 border-t-cyber-blue rounded-full animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <ScanLine className="w-4 h-4" />
                        Run OCR Analysis
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleReset}
                    className="flex-1 bg-surface-700 hover:bg-surface-600 text-white font-medium py-2.5 rounded-lg text-sm transition-all duration-200"
                  >
                    Upload New Screenshot
                  </button>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-4 bg-surface-800 border border-surface-600 text-gray-400 rounded-lg text-sm hover:text-white hover:border-surface-500 transition-all"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-5">
            <ScanLine className="w-4 h-4 text-cyber-green" />
            <span className="text-xs font-mono text-cyber-green uppercase tracking-widest">Analysis Results</span>
          </div>

          {ocrResult ? (
            <div className="space-y-4">
              {/* OCR Extracted Data */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Extracted Data</h3>
                <div className="p-3 bg-surface-800 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-gray-400">Transaction ID</span>
                  <span className="text-sm font-mono text-cyber-blue">{ocrResult.transactionId}</span>
                </div>
                <div className="p-3 bg-surface-800 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-gray-400">Amount</span>
                  <span className="text-sm font-mono text-white">${ocrResult.amount}</span>
                </div>
                <div className="p-3 bg-surface-800 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-gray-400">Date</span>
                  <span className="text-sm font-mono text-gray-300">{ocrResult.date}</span>
                </div>
              </div>

              {/* Verification Result */}
              <div className={`rounded-xl p-5 text-center border ${
                ocrResult.verified
                  ? 'border-cyber-green/30 bg-cyber-green/5 glow-green'
                  : 'border-cyber-red/30 bg-cyber-red/5 glow-red'
              }`}>
                {ocrResult.verified ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-cyber-green mx-auto mb-2" />
                    <h3 className="text-lg font-bold text-cyber-green">Verified</h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono">Screenshot matches server records</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-10 h-10 text-cyber-red mx-auto mb-2" />
                    <h3 className="text-lg font-bold text-cyber-red">Fraud Detected</h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono">Screenshot data does not match server records</p>
                  </>
                )}
              </div>
            </div>
          ) : analyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-2 border-cyber-blue/30 border-t-cyber-blue rounded-full animate-spin mb-4" />
              <p className="text-sm text-cyber-blue font-mono">Processing OCR...</p>
              <p className="text-xs text-gray-600 mt-1 font-mono">Extracting text from screenshot</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-600">
              <ScanLine className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Upload a screenshot to begin analysis</p>
              <p className="text-xs mt-1 font-mono text-gray-700">OCR results will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
