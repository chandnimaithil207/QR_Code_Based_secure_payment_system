import { useState, useEffect } from 'react';
import { Search, Filter, ArrowLeftRight, Loader2, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type RowStatus = 'verified' | 'pending' | 'fraud' | 'expired';

interface UnifiedRow {
  key: string;
  orderId: string;
  transactionId: string | null;
  customerName: string | null;
  amount: number;
  status: RowStatus;
  date: string;
  source: 'qr' | 'transaction';
}

function StatusPill({ status }: { status: RowStatus }) {
  const map: Record<RowStatus, { label: string; className: string }> = {
    verified: { label: 'Verified', className: 'bg-cyber-green/20 text-cyber-green border border-cyber-green/50' },
    pending:  { label: 'Pending',  className: 'bg-cyber-yellow/20 text-cyber-yellow border border-cyber-yellow/50' },
    fraud:    { label: 'Fraud',    className: 'bg-cyber-red/20 text-cyber-red border border-cyber-red/50' },
    expired:  { label: 'Expired',  className: 'bg-gray-700/60 text-gray-400 border border-gray-600' },
  };
  const { label, className } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {status === 'verified' && <CheckCircle2 className="w-3 h-3" />}
      {status === 'pending'  && <Clock className="w-3 h-3" />}
      {status === 'fraud'    && <XCircle className="w-3 h-3" />}
      {status === 'expired'  && <XCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}

export default function TransactionHistoryPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RowStatus | 'all'>('all');
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [txRes, qrRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('transaction_id, order_id, amount, status, customer_name, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('qr_codes')
          .select('id, order_id, amount, used, expires_at, created_at')
          .order('created_at', { ascending: false }),
      ]);

      if (txRes.error) { setError(txRes.error.message); setLoading(false); return; }

      const txRows = txRes.data ?? [];
      const qrRows = qrRes.data ?? [];

      // Build a set of order_ids that already have a transaction.
      const paidOrderIds = new Set(txRows.map(t => t.order_id));

      // Transaction rows.
      const transactionItems: UnifiedRow[] = txRows.map(t => ({
        key: t.transaction_id,
        orderId: t.order_id,
        transactionId: t.transaction_id,
        customerName: t.customer_name,
        amount: Number(t.amount),
        status: t.status as RowStatus,
        date: t.created_at,
        source: 'transaction',
      }));

      // QR rows that don't yet have a transaction (pending or expired).
      const now = new Date();
      const pendingItems: UnifiedRow[] = (qrRows as { id: string; order_id: string; amount: number; used: boolean; expires_at: string; created_at: string }[])
        .filter(q => !paidOrderIds.has(q.order_id))
        .map(q => ({
          key: `qr-${q.id}`,
          orderId: q.order_id,
          transactionId: null,
          customerName: null,
          amount: Number(q.amount),
          status: new Date(q.expires_at) < now ? 'expired' : 'pending',
          date: q.created_at,
          source: 'qr',
        }));

      setRows([...transactionItems, ...pendingItems].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
      setError(null);
      setLoading(false);
    };
    load();
  }, []);

  const filters: { value: RowStatus | 'all'; label: string }[] = [
    { value: 'all',      label: 'All' },
    { value: 'verified', label: 'Verified' },
    { value: 'pending',  label: 'Pending' },
    { value: 'expired',  label: 'Expired' },
    { value: 'fraud',    label: 'Fraud' },
  ];

  const filtered = rows.filter(row => {
    const q = search.toLowerCase();
    const matchesSearch =
      row.orderId.toLowerCase().includes(q) ||
      (row.transactionId?.toLowerCase().includes(q) ?? false) ||
      (row.customerName?.toLowerCase().includes(q) ?? false);
    return matchesSearch && (filter === 'all' || row.status === filter);
  });

  const counts = rows.reduce<Record<string, number>>((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Transaction History</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">All QR codes and completed payments — pending = QR generated, not yet paid</p>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2">
        {(['verified', 'pending', 'expired', 'fraud'] as RowStatus[]).map(s => (
          <div key={s} className="flex items-center gap-2 px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg">
            <StatusPill status={s} />
            <span className="text-sm font-mono text-white">{counts[s] ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="bg-surface-900 border border-surface-600 rounded-xl p-4 card-glow">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Order ID, Transaction ID, or Customer..."
              className="w-full bg-surface-800 border border-surface-600 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue focus:ring-2 focus:ring-cyber-blue/30 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-4 h-4 text-gray-500 hidden sm:block" />
            {filters.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  filter === f.value
                    ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/50'
                    : 'bg-surface-800 text-gray-400 border border-surface-700 hover:text-white hover:border-surface-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface-900 border border-surface-600 rounded-xl overflow-hidden card-glow">
        <div className="flex items-center justify-between p-4 border-b border-surface-600">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-cyber-blue" />
            <span className="text-sm font-semibold text-white">{filtered.length} rows</span>
          </div>
          <span className="text-xs font-mono text-gray-500">Live data</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 border-2 border-cyber-blue/30 border-t-cyber-blue rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 m-4 bg-cyber-red/15 border border-cyber-red/50 text-cyber-red text-xs font-mono rounded-lg flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.key} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-cyber-blue">{row.orderId}</td>
                    <td className="px-4 py-3 font-mono text-gray-300">
                      {row.transactionId ?? <span className="text-gray-600 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {row.customerName ?? <span className="text-gray-600 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-white">
                      ${row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3"><StatusPill status={row.status} /></td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {new Date(row.date).toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-600">
                      {rows.length === 0
                        ? 'No QR codes generated yet. Go to Generate QR to create one.'
                        : 'No rows match that filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
