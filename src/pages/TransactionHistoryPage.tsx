import { useState } from 'react';
import { Search, Filter, ArrowLeftRight } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { allTransactions } from '../lib/mockData';
import type { TransactionStatus } from '../types';

export default function TransactionHistoryPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TransactionStatus | 'all'>('all');

  const filtered = allTransactions.filter(tx => {
    const matchesSearch =
      tx.orderId.toLowerCase().includes(search.toLowerCase()) ||
      tx.transactionId.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || tx.status === filter;
    return matchesSearch && matchesFilter;
  });

  const filters: { value: TransactionStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'verified', label: 'Verified' },
    { value: 'pending', label: 'Pending' },
    { value: 'fraud', label: 'Fraud' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Transaction History</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">Search and filter all verified transactions</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-surface-900 border border-surface-700 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Order ID or Transaction ID..."
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

      {/* Results */}
      <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-700">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-cyber-blue" />
            <span className="text-sm font-semibold text-white">{filtered.length} Transactions</span>
          </div>
          <span className="text-xs font-mono text-gray-500">Real-time sync</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.transactionId} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-cyber-blue">{tx.orderId}</td>
                  <td className="px-4 py-3 font-mono text-gray-300">{tx.transactionId}</td>
                  <td className="px-4 py-3 font-mono text-white">${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{tx.timestamp}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-600">
                    No transactions found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
