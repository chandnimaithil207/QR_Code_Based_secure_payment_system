import { useState, useEffect } from 'react';
import { ShoppingCart, ArrowLeftRight, ShieldCheck, ShieldAlert, Loader2, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { supabase } from '../lib/supabaseClient';

interface DashboardData {
  totalOrders: number;
  totalTransactions: number;
  verifiedPayments: number;
  fraudAlerts: number;
  pendingQRs: number;
  recent: {
    transaction_id: string;
    order_id: string;
    amount: number;
    status: 'verified' | 'pending' | 'fraud';
    customer_name: string | null;
    created_at: string;
  }[];
  trend: { date: string; verified: number; pending: number; fraud: number }[];
}

function buildEmptyDashboard(): DashboardData {
  return { totalOrders: 0, totalTransactions: 0, verifiedPayments: 0, fraudAlerts: 0, pendingQRs: 0, recent: [], trend: [] };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(buildEmptyDashboard());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [txRes, fraudRes, qrRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('transaction_id, order_id, amount, status, customer_name, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('fraud_logs').select('id', { count: 'exact', head: true }),
        supabase
          .from('qr_codes')
          .select('order_id, used, expires_at')
          .eq('used', false),
      ]);

      const txRows = (txRes.data ?? []) as DashboardData['recent'];
      const fraudCount = fraudRes.count ?? 0;
      const qrRows = (qrRes.data ?? []) as { order_id: string; used: boolean; expires_at: string }[];

      // Pending QRs: not used, not expired, and no matching transaction yet.
      const paidOrderIds = new Set(txRows.map(t => t.order_id));
      const now = new Date();
      const pendingQRs = qrRows.filter(
        q => !paidOrderIds.has(q.order_id) && new Date(q.expires_at) > now
      ).length;

      const orderIds = new Set(txRows.map(t => t.order_id));
      const verified = txRows.filter(t => t.status === 'verified').length;
      const fraudTx = txRows.filter(t => t.status === 'fraud').length;

      const buckets: Record<string, { verified: number; pending: number; fraud: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        buckets[key] = { verified: 0, pending: 0, fraud: 0 };
      }
      for (const tx of txRows) {
        const key = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (buckets[key]) {
          if (tx.status === 'verified') buckets[key].verified += 1;
          else if (tx.status === 'pending') buckets[key].pending += 1;
          else buckets[key].fraud += 1;
        }
      }
      const trend = Object.entries(buckets).map(([date, v]) => ({ date, ...v }));

      setData({
        totalOrders: orderIds.size,
        totalTransactions: txRows.length,
        verifiedPayments: verified,
        fraudAlerts: fraudCount + fraudTx,
        pendingQRs,
        recent: txRows.slice(0, 8),
        trend,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 border-2 border-cyber-green/30 border-t-cyber-green rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">Real-time payment verification overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard title="QRs Awaiting Payment" value={data.pendingQRs} icon={<Clock className="w-4 h-4" />} color="yellow" />
        <StatCard title="Total Paid" value={data.totalTransactions} icon={<ShoppingCart className="w-4 h-4" />} color="blue" />
        <StatCard title="Unique Orders" value={data.totalOrders} icon={<ArrowLeftRight className="w-4 h-4" />} color="blue" />
        <StatCard title="Verified" value={data.verifiedPayments} icon={<ShieldCheck className="w-4 h-4" />} color="green" />
        <StatCard title="Fraud Alerts" value={data.fraudAlerts} icon={<ShieldAlert className="w-4 h-4" />} color="red" />
      </div>

      <div className="bg-surface-900 border border-surface-700 rounded-xl p-4 lg:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Transaction Trend</h2>
          <span className="text-xs font-mono text-gray-500">Last 7 days</span>
        </div>
        {data.trend.some(t => t.verified + t.pending + t.fraud > 0) ? (
          <div className="h-52 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend}>
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
                <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
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
        ) : (
          <div className="h-52 lg:h-64 flex items-center justify-center text-gray-600 text-xs font-mono">
            No transactions yet — trend will fill as payments come in.
          </div>
        )}
      </div>

      <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 lg:p-5 border-b border-surface-700">
          <h2 className="text-sm font-semibold text-white">Recent Completed Payments</h2>
          <span className="text-xs font-mono text-cyber-blue">Live Feed</span>
        </div>
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
              {data.recent.map(tx => (
                <tr key={tx.transaction_id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-cyber-blue">{tx.order_id}</td>
                  <td className="px-4 py-3 font-mono text-gray-300">{tx.transaction_id}</td>
                  <td className="px-4 py-3 text-gray-300">{tx.customer_name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-white">${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{new Date(tx.created_at).toLocaleString('en-US')}</td>
                </tr>
              ))}
              {data.recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-600">
                    No completed payments yet. Generate a QR and share it with a customer.
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
