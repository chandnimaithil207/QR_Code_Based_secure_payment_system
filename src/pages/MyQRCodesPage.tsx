import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ListOrdered, Clock, CheckCircle2, XCircle, RotateCcw, X, Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type QRStatus = 'pending' | 'expired' | 'paid' | 'cancelled';

interface QRRow {
  id: string;
  order_id: string;
  token: string;
  merchant_name: string;
  amount: number;
  used: boolean;
  cancelled: boolean;
  expires_at: string;
  created_at: string;
}

interface TxRow {
  qr_code_id: string;
  order_id: string;
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

function computeStatus(qr: QRRow, paidOrderIds: Set<string>, paidQrIds: Set<string>): QRStatus {
  if (qr.cancelled) return 'cancelled';
  if (qr.used || paidQrIds.has(qr.id) || paidOrderIds.has(qr.order_id)) return 'paid';
  if (new Date(qr.expires_at) < new Date()) return 'expired';
  return 'pending';
}

const statusConfig: Record<QRStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'Pending', bg: 'bg-cyber-yellow/20', text: 'text-cyber-yellow', dot: 'bg-cyber-yellow' },
  paid: { label: 'Paid', bg: 'bg-cyber-green/20', text: 'text-cyber-green', dot: 'bg-cyber-green' },
  expired: { label: 'Expired', bg: 'bg-gray-600/20', text: 'text-gray-400', dot: 'bg-gray-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-cyber-red/20', text: 'text-cyber-red', dot: 'bg-cyber-red' },
};

const filterTabs: ('All' | QRStatus)[] = ['All', 'pending', 'expired', 'paid', 'cancelled'];

export default function MyQRCodesPage() {
  const [qrs, setQrs] = useState<QRRow[]>([]);
  const [paidOrderIds, setPaidOrderIds] = useState<Set<string>>(new Set());
  const [paidQrIds, setPaidQrIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'All' | QRStatus>('All');
  const [reopenQR, setReopenQR] = useState<QRRow | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [qrRes, txRes] = await Promise.all([
      supabase
        .from('qr_codes')
        .select('id, order_id, token, merchant_name, amount, used, cancelled, expires_at, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('transactions')
        .select('qr_code_id, order_id'),
    ]);

    const qrRows = (qrRes.data ?? []) as QRRow[];
    const txRows = (txRes.data ?? []) as TxRow[];

    setQrs(qrRows);
    setPaidOrderIds(new Set(txRows.map(t => t.order_id)));
    setPaidQrIds(new Set(txRows.map(t => t.qr_code_id).filter(Boolean) as string[]));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancel = async (qr: QRRow) => {
    setActionLoading(qr.id);
    setError(null);
    const { error: updateError } = await supabase
      .from('qr_codes')
      .update({ cancelled: true })
      .eq('id', qr.id);
    setActionLoading(null);
    if (updateError) {
      setError('Could not cancel the QR code. Please try again.');
      return;
    }
    await loadData();
  };

  const handleRegenerate = async (qr: QRRow) => {
    setActionLoading(qr.id);
    setError(null);
    const orderId = generateOrderId();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from('qr_codes')
      .insert({
        order_id: orderId,
        token,
        merchant_name: qr.merchant_name,
        amount: qr.amount,
        expiry_time: expiresAt,
        expires_at: expiresAt,
      });

    setActionLoading(null);
    if (insertError) {
      setError('Could not regenerate the QR code. Please try again.');
      return;
    }
    await loadData();
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/customer-payment?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (token: string) => {
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
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      const link = document.createElement('a');
      link.download = `secureqr-${token}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const filteredQRs = qrs.filter(qr => {
    const status = computeStatus(qr, paidOrderIds, paidQrIds);
    return activeFilter === 'All' || status === activeFilter;
  });

  const counts = qrs.reduce((acc, qr) => {
    const status = computeStatus(qr, paidOrderIds, paidQrIds);
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {} as Record<QRStatus, number>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">My QR Codes</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">Manage all your generated QR codes — reopen, cancel, or regenerate</p>
      </div>

      {error && (
        <div className="bg-cyber-red/15 border border-cyber-red/50 text-cyber-red text-xs font-mono px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map(tab => {
          const count = tab === 'All' ? qrs.length : (counts[tab as QRStatus] ?? 0);
          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeFilter === tab
                  ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/40'
                  : 'bg-surface-800 text-gray-400 border border-surface-600 hover:text-white'
              }`}
            >
              {tab === 'All' ? 'All' : statusConfig[tab as QRStatus].label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 border-2 border-cyber-green/30 border-t-cyber-green rounded-full animate-spin" />
        </div>
      ) : filteredQRs.length === 0 ? (
        <div className="bg-surface-900 border border-surface-600 rounded-xl p-10 text-center">
          <ListOrdered className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No QR codes in this category.</p>
        </div>
      ) : (
        <div className="bg-surface-900 border border-surface-600 rounded-xl overflow-hidden card-glow">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-600">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Merchant</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Expires</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQRs.map(qr => {
                  const status = computeStatus(qr, paidOrderIds, paidQrIds);
                  const cfg = statusConfig[status];
                  return (
                    <tr key={qr.id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-cyber-blue">{qr.order_id}</td>
                      <td className="px-4 py-3 text-gray-300">{qr.merchant_name}</td>
                      <td className="px-4 py-3 font-mono text-white">
                        ${Number(qr.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {new Date(qr.created_at).toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {new Date(qr.expires_at).toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {status === 'pending' && (
                            <>
                              <button
                                onClick={() => setReopenQR(qr)}
                                disabled={actionLoading === qr.id}
                                title="Reopen — view QR and share link"
                                className="p-1.5 rounded-lg bg-cyber-blue/15 border border-cyber-blue/40 text-cyber-blue hover:bg-cyber-blue/25 transition-all disabled:opacity-50"
                              >
                                {actionLoading === qr.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleCancel(qr)}
                                disabled={actionLoading === qr.id}
                                title="Cancel this QR"
                                className="p-1.5 rounded-lg bg-cyber-red/15 border border-cyber-red/40 text-cyber-red hover:bg-cyber-red/25 transition-all disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {(status === 'expired' || status === 'cancelled') && (
                            <button
                              onClick={() => handleRegenerate(qr)}
                              disabled={actionLoading === qr.id}
                              title="Regenerate a fresh QR with same details"
                              className="px-2.5 py-1.5 rounded-lg bg-cyber-green/15 border border-cyber-green/40 text-cyber-green hover:bg-cyber-green/25 transition-all text-xs font-medium disabled:opacity-50 flex items-center gap-1"
                            >
                              {actionLoading === qr.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                              Regenerate
                            </button>
                          )}
                          {(status === 'paid') && (
                            <span className="text-xs text-gray-600 font-mono">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reopen modal */}
      {reopenQR && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setReopenQR(null)}>
          <div className="bg-surface-900 border border-surface-600 rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">QR Code — {reopenQR.order_id}</h3>
              <button onClick={() => setReopenQR(null)} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={qrRef} className="inline-block p-4 bg-white rounded-xl mx-auto block">
              <QRCodeSVG
                value={`${window.location.origin}/customer-payment?token=${reopenQR.token}`}
                size={180}
                level="H"
                bgColor="#ffffff"
                fgColor="#0a0a0f"
              />
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between p-2.5 bg-surface-800 rounded-lg">
                <span className="text-xs text-gray-400">Amount</span>
                <span className="text-sm font-mono text-cyber-green">
                  ${Number(reopenQR.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-800 rounded-lg">
                <span className="text-xs text-gray-400">Token</span>
                <span className="text-xs font-mono text-cyber-green truncate max-w-[130px]">{reopenQR.token}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-800 rounded-lg">
                <span className="text-xs text-gray-400">Expires</span>
                <span className="text-xs font-mono text-cyber-yellow">
                  {new Date(reopenQR.expires_at).toLocaleString('en-US')}
                </span>
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-cyber-green/10 border border-cyber-green/40 rounded-lg">
              <a
                href={`${window.location.origin}/customer-payment?token=${reopenQR.token}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyber-blue font-mono hover:underline flex items-center gap-1 break-all"
              >
                {`${window.location.origin}/customer-payment?token=${reopenQR.token}`}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleCopyLink(reopenQR.token)}
                className="flex-1 bg-cyber-blue/15 border border-cyber-blue/40 text-cyber-blue font-medium py-2 rounded-lg text-sm transition-all hover:bg-cyber-blue/25 flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={() => handleDownload(reopenQR.token)}
                className="flex-1 bg-surface-700 hover:bg-surface-600 text-white font-medium py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
