import { Copy, KeyRound, Clock, Bug } from 'lucide-react';
import StatCard from '../components/StatCard';
import { fraudStats, fraudLogs } from '../lib/mockData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const pieData = [
  { name: 'Duplicates', value: fraudStats.duplicateTransactions, color: '#00d4ff' },
  { name: 'Invalid Tokens', value: fraudStats.invalidTokens, color: '#ff3366' },
  { name: 'Expired QR', value: fraudStats.expiredQRCodes, color: '#ffcc00' },
  { name: 'Tampering', value: fraudStats.tamperingAttempts, color: '#cc66ff' },
];

const fraudTypeColors: Record<string, string> = {
  'Duplicate Payment': 'text-cyber-blue bg-cyber-blue/15',
  'Invalid Token': 'text-cyber-red bg-cyber-red/15',
  'Expired QR': 'text-cyber-yellow bg-cyber-yellow/15',
  'Tampering': 'text-cyber-purple bg-cyber-purple/15',
};

export default function FraudMonitoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Fraud Monitoring</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">Real-time fraud detection and alert system</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Duplicate TXN" value={fraudStats.duplicateTransactions} icon={<Copy className="w-4 h-4" />} color="blue" />
        <StatCard title="Invalid Tokens" value={fraudStats.invalidTokens} icon={<KeyRound className="w-4 h-4" />} color="red" />
        <StatCard title="Expired QR" value={fraudStats.expiredQRCodes} icon={<Clock className="w-4 h-4" />} color="yellow" />
        <StatCard title="Tampering" value={fraudStats.tamperingAttempts} icon={<Bug className="w-4 h-4" />} color="red" />
      </div>

      {/* Chart + Summary */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-white mb-4">Fraud Distribution</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} strokeWidth={0}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a1a24', border: '1px solid #2e2e40', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="text-gray-400">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fraud Logs */}
        <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between p-4 border-b border-surface-700">
            <h2 className="text-sm font-semibold text-white">Fraud Logs</h2>
            <span className="text-xs font-mono text-cyber-red">{fraudLogs.length} incidents</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fraud Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {fraudLogs.map((log, i) => (
                  <tr key={i} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-cyber-blue">{log.transactionId}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${fraudTypeColors[log.fraudType] || 'text-gray-400 bg-surface-700'}`}>
                        {log.fraudType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{log.description}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
