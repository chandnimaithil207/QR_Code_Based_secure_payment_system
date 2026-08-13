import { useState, useRef } from 'react';
import { FlaskConical, Upload, Play, Download, Loader2, CheckCircle2, XCircle, Plus, Trash2, FileImage } from 'lucide-react';
import { runOCR, extractTransactionDetails, verifyAgainstDatabase, type VerificationResult } from '../lib/ocrPipeline';

type Label = 'genuine' | 'tampered';

interface EvalImage {
  id: string;
  file: File;
  preview: string;
  label: Label;
  result: VerificationResult | null;
  running: boolean;
  error: string | null;
}

interface EvalRow {
  filename: string;
  actual: Label;
  predicted: 'Verified' | 'Mismatch' | 'Not Found';
  correct: boolean;
}

function predictLabel(result: VerificationResult | null): 'Verified' | 'Mismatch' | 'Not Found' {
  if (!result) return 'Not Found';
  if (result.status === 'verified') return 'Verified';
  if (result.status === 'mismatch') return 'Mismatch';
  return 'Not Found';
}

function isCorrect(label: Label, predicted: 'Verified' | 'Mismatch' | 'Not Found'): boolean {
  if (label === 'genuine') return predicted === 'Verified';
  return predicted === 'Mismatch' || predicted === 'Not Found';
}

export default function EvaluationModePage() {
  const [images, setImages] = useState<EvalImage[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newImages: EvalImage[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      preview: URL.createObjectURL(file),
      label: 'genuine' as Label,
      result: null,
      running: false,
      error: null,
    }));
    setImages(prev => [...prev, ...newImages]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const setLabel = (id: string, label: Label) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, label } : img));
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter(img => img.id !== id);
    });
  };

  const runEvaluation = async () => {
    if (images.length === 0) return;
    setRunning(true);
    setProgress('Starting evaluation...');

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      setProgress(`Processing ${i + 1}/${images.length}: ${img.file.name}`);
      setImages(prev => prev.map(m => m.id === img.id ? { ...m, running: true, error: null } : m));

      try {
        const text = await runOCR(img.preview, (msg) => {
          if (msg) setProgress(`[${i + 1}/${images.length}] ${img.file.name}: ${msg}`);
        });

        const extracted = extractTransactionDetails(text);

        if (!extracted.transactionId || !extracted.amount) {
          setImages(prev => prev.map(m => m.id === img.id ? {
            ...m,
            running: false,
            result: null,
            error: 'Could not extract transaction ID or amount from image.',
          } : m));
          continue;
        }

        const result = await verifyAgainstDatabase(extracted.transactionId, extracted.amount);
        setImages(prev => prev.map(m => m.id === img.id ? { ...m, running: false, result } : m));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setImages(prev => prev.map(m => m.id === img.id ? { ...m, running: false, error: msg } : m));
      }
    }

    setProgress(null);
    setRunning(false);
  };

  const evalRows: EvalRow[] = images.map(img => ({
    filename: img.file.name,
    actual: img.label,
    predicted: predictLabel(img.result),
    correct: isCorrect(img.label, predictLabel(img.result)),
  }));

  const TP = evalRows.filter(r => r.actual === 'tampered' && r.predicted !== 'Verified').length;
  const FP = evalRows.filter(r => r.actual === 'genuine' && r.predicted !== 'Verified').length;
  const TN = evalRows.filter(r => r.actual === 'genuine' && r.predicted === 'Verified').length;
  const FN = evalRows.filter(r => r.actual === 'tampered' && r.predicted === 'Verified').length;

  const precision = TP + FP > 0 ? TP / (TP + FP) : 0;
  const recall = TP + FN > 0 ? TP / (TP + FN) : 0;
  const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  const accuracy = evalRows.length > 0 ? (TP + TN) / evalRows.length : 0;

  const hasResults = images.some(img => img.result !== null || img.error !== null);

  const exportCSV = () => {
    const header = 'filename,actual_label,predicted,correct\n';
    const rows = evalRows.map(r =>
      `"${r.filename}","${r.actual}","${r.predicted}","${r.correct ? 'yes' : 'no'}"`
    ).join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'evaluation-results.csv';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const metricCard = (label: string, value: string, color: string) => (
    <div className={`rounded-lg border p-3 text-center ${color}`}>
      <div className="text-lg font-bold font-mono">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Evaluation Mode</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">Batch-test OCR verification accuracy against labeled images</p>
      </div>

      {/* Upload area */}
      <div className="bg-surface-900 border border-surface-600 rounded-xl p-5 card-glow">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="w-4 h-4 text-cyber-green" />
          <span className="text-xs font-mono text-cyber-green uppercase tracking-widest">Test Images</span>
        </div>

        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleAddFiles} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={running}
          className="w-full border-2 border-dashed border-surface-600 rounded-xl p-8 text-center cursor-pointer hover:border-cyber-green hover:bg-surface-800/50 transition-all disabled:opacity-50"
        >
          <Upload className="w-10 h-10 text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Click to add images</p>
          <p className="text-xs text-gray-600 mt-1 font-mono">Tag each as genuine or tampered, then run evaluation</p>
        </button>

        {images.length > 0 && (
          <div className="space-y-2 mt-4">
            {images.map(img => (
              <div key={img.id} className="flex items-center gap-3 p-3 bg-surface-800 rounded-lg">
                <FileImage className="w-8 h-8 text-gray-500 shrink-0" />
                <img src={img.preview} alt={img.file.name} className="w-12 h-12 object-cover rounded-lg shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate font-mono">{img.file.name}</p>
                  <div className="flex gap-1.5 mt-1">
                    <button
                      onClick={() => setLabel(img.id, 'genuine')}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                        img.label === 'genuine'
                          ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/40'
                          : 'bg-surface-700 text-gray-500 border border-transparent hover:text-gray-300'
                      }`}
                    >
                      Genuine
                    </button>
                    <button
                      onClick={() => setLabel(img.id, 'tampered')}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                        img.label === 'tampered'
                          ? 'bg-cyber-red/20 text-cyber-red border border-cyber-red/40'
                          : 'bg-surface-700 text-gray-500 border border-transparent hover:text-gray-300'
                      }`}
                    >
                      Tampered
                    </button>
                  </div>
                </div>

                {img.running && <Loader2 className="w-4 h-4 text-cyber-blue animate-spin shrink-0" />}
                {img.result && !img.running && (
                  <span className="text-xs shrink-0">
                    {img.result.verified
                      ? <span className="text-cyber-green flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Verified</span>
                      : <span className="text-cyber-red flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{img.result.status === 'mismatch' ? 'Mismatch' : 'Not Found'}</span>
                    }
                  </span>
                )}
                {img.error && !img.running && (
                  <span className="text-xs text-gray-500 shrink-0 font-mono">error</span>
                )}

                <button
                  onClick={() => removeImage(img.id)}
                  disabled={running}
                  className="p-1 text-gray-600 hover:text-cyber-red transition-colors shrink-0 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {progress && (
          <div className="mt-4 flex items-center gap-2 text-xs text-cyber-blue font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {progress}
          </div>
        )}

        {images.length > 0 && (
          <button
            onClick={runEvaluation}
            disabled={running}
            className="mt-4 w-full bg-gradient-to-r from-cyber-green to-cyber-green-dark hover:from-cyber-green-light hover:to-cyber-green text-surface-950 font-semibold py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {running ? <><Loader2 className="w-4 h-4 animate-spin" />Running...</> : <><Play className="w-4 h-4" />Run Evaluation ({images.length} images)</>}
          </button>
        )}
      </div>

      {/* Results */}
      {hasResults && (
        <>
          {/* Metrics */}
          <div className="bg-surface-900 border border-surface-600 rounded-xl p-5 card-glow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Confusion Matrix & Metrics</h2>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-blue/15 border border-cyber-blue/40 text-cyber-blue rounded-lg text-xs font-medium hover:bg-cyber-blue/25 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {metricCard('True Positives', String(TP), 'border-cyber-green/40 bg-cyber-green/10')}
              {metricCard('False Positives', String(FP), 'border-cyber-red/40 bg-cyber-red/10')}
              {metricCard('True Negatives', String(TN), 'border-cyber-green/40 bg-cyber-green/10')}
              {metricCard('False Negatives', String(FN), 'border-cyber-red/40 bg-cyber-red/10')}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {metricCard('Precision', `${(precision * 100).toFixed(1)}%`, 'border-surface-600 bg-surface-800')}
              {metricCard('Recall', `${(recall * 100).toFixed(1)}%`, 'border-surface-600 bg-surface-800')}
              {metricCard('F1 Score', `${(f1 * 100).toFixed(1)}%`, 'border-surface-600 bg-surface-800')}
              {metricCard('Accuracy', `${(accuracy * 100).toFixed(1)}%`, 'border-cyber-blue/40 bg-cyber-blue/10')}
            </div>
          </div>

          {/* Results table */}
          <div className="bg-surface-900 border border-surface-600 rounded-xl overflow-hidden card-glow">
            <div className="p-4 border-b border-surface-600">
              <h2 className="text-sm font-semibold text-white">Per-Image Results</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-600">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Filename</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actual</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Predicted</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Correct?</th>
                  </tr>
                </thead>
                <tbody>
                  {images.map(img => {
                    const predicted = predictLabel(img.result);
                    const correct = isCorrect(img.label, predicted);
                    return (
                      <tr key={img.id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                        <td className="px-4 py-3 text-gray-300 font-mono text-xs truncate max-w-[200px]">{img.file.name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${img.label === 'genuine' ? 'text-cyber-green' : 'text-cyber-red'}`}>
                            {img.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-xs">
                          {img.error ? <span className="text-gray-500">error</span> : predicted}
                        </td>
                        <td className="px-4 py-3">
                          {img.error ? (
                            <span className="text-gray-600 text-xs">—</span>
                          ) : correct ? (
                            <CheckCircle2 className="w-4 h-4 text-cyber-green" />
                          ) : (
                            <XCircle className="w-4 h-4 text-cyber-red" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
