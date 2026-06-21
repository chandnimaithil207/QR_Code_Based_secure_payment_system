import { useState, useEffect } from 'react';
import { Search, Filter, ArrowLeftRight, Loader2, AlertCircle } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { supabase } from '../lib/supabaseClient';
import type { TransactionStatus } from '../types';

interface TransactionRow {
  transaction_id: string;
  order_id: string;
  amount: number;
  status: TransactionStatus;
  customer_name: string | null;
  created_at: string;
}

export default function TransactionHistoryPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TransactionStatus | 'all'>('all');
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('transactions')
        .select('transaction_id, order_id, amount, status, customer_name, created_at')
        .order('created_at', { ascending: false });

      if (queryError) {
        setError(queryError.message);
        setRows([]);
      } else {
        setRows((data ?? []) as TransactionRow[]);
        setError(null);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filters: { value: TransactionStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'verified', label: 'Verified' },
    { value: 'pending', label: 'Pending' },
    { value: 'fraud', label: 'Fraud' },
  ];

  const filtered = rows.filter(tx => {
    const q = search.toLowerCase();
    const matchesSearch =
      tx.order_id.toLowerCase().includes(q) ||
      tx.transaction_id.toLowerCase().includes(q) ||
      (tx.customer_name?.toLowerCase().includes(q) ?? false);
    const matchesFilter = filter === 'all' || tx.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Transaction History</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">Search and filter all transactions</p>
      </div>

      <div className="bg-surface-900 border border-surface-700 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Order ID, Transaction ID, or Customer..."
              className="w-full bg-surface-800 border border-surface-600 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/30 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-500 hidden sm:block" />
            {filters.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  filter === f.value
                    ? 'bg-cyber-blue/15 text-cyber-blue border border-cyber-blue/30'
                    : 'bg-surface-800 text-gray-400 border border-surface-700 hover:text-gray-200 hover:border-surface-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-700">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-cyber-blue" />
            <span className="text-sm font-semibold text-white">{filtered.length} Transactions</span>
          </div>
          <span className="text-xs font-mono text-gray-500">Live sync</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 border-2 border-cyber-blue/30 border-t-cyber-blue rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 m-4 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red text-xs font-mono rounded-lg flex items-start gap-2">
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
                {filtered.map(tx => (
                  <tr key={tx.transaction_id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-cyber-blue">{tx.order_id}</td>
                    <td className="px-4 py-3 font-mono text-gray-300">{tx.transaction_id}</td>
                    <td className="px-4 py-3 text-gray-300">{tx.customer_name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-white">
                      ${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {new Date(tx.created_at).toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-600">
                      No transactions yet. Generate a QR code and have a customer pay.
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
