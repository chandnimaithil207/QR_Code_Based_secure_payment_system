import { ShoppingCart, ArrowLeftRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { dashboardStats, recentTransactions, transactionTrend } from '../lib/mockData';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">Real-time payment verification overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Total Orders" value={dashboardStats.totalOrders} icon={<ShoppingCart className="w-4 h-4" />} color="blue" trend="+12% today" />
        <StatCard title="Transactions" value={dashboardStats.totalTransactions} icon={<ArrowLeftRight className="w-4 h-4" />} color="green" trend="+8% today" />
        <StatCard title="Verified" value={dashboardStats.verifiedPayments} icon={<ShieldCheck className="w-4 h-4" />} color="green" trend="97.2% rate" />
        <StatCard title="Fraud Alerts" value={dashboardStats.fraudAlerts} icon={<ShieldAlert className="w-4 h-4" />} color="red" trend="3 critical" />
      </div>

      {/* Chart */}
      <div className="bg-surface-900 border border-surface-700 rounded-xl p-4 lg:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Transaction Trend</h2>
          <span className="text-xs font-mono text-gray-500">Last 7 days</span>
        </div>
        <div className="h-52 lg:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={transactionTrend}>
              <defs>
                <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gYellow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffcc00" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#ffcc00" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff3366" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#ff3366" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a1a24', border: '1px solid #2e2e40', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#999' }}
              />
              <Area type="monotone" dataKey="verified" stroke="#00ff88" fill="url(#gGreen)" strokeWidth={2} />
              <Area type="monotone" dataKey="pending" stroke="#ffcc00" fill="url(#gYellow)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="fraud" stroke="#ff3366" fill="url(#gRed)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 lg:p-5 border-b border-surface-700">
          <h2 className="text-sm font-semibold text-white">Recent Transactions</h2>
          <span className="text-xs font-mono text-cyber-blue">Live Feed</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map(tx => (
                <tr key={tx.transactionId} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-cyber-blue">{tx.orderId}</td>
                  <td className="px-4 py-3 font-mono text-gray-300">{tx.transactionId}</td>
                  <td className="px-4 py-3 font-mono text-white">${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{tx.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
