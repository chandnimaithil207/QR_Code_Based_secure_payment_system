import { useState, useEffect } from 'react';
import { Copy, KeyRound, Clock, Bug, Loader2, AlertCircle } from 'lucide-react';
import StatCard from '../components/StatCard';
import { supabase } from '../lib/supabaseClient';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface FraudLogRow {
  id: string;
  transaction_id: string;
  fraud_type: string;
  description: string;
  created_at: string;
}

const fraudTypeColors: Record<string, string> = {
  'Duplicate Payment': 'text-cyber-blue bg-cyber-blue/20',
  'Invalid Token': 'text-cyber-red bg-cyber-red/20',
  'Expired QR': 'text-cyber-yellow bg-cyber-yellow/20',
  'Tampering': 'text-cyber-purple bg-cyber-purple/20',
};

const chartColorMap: Record<string, string> = {
  'Duplicate Payment': '#00e5ff',
  'Invalid Token': '#ff4477',
  'Expired QR': '#ffd700',
  'Tampering': '#dd55ff',
};

export default function FraudMonitoringPage() {
  const [logs, setLogs] = useState<FraudLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('fraud_logs')
        .select('id, transaction_id, fraud_type, description, created_at')
        .order('created_at', { ascending: false });

      if (queryError) {
        setError(queryError.message);
        setLogs([]);
      } else {
        setLogs((data ?? []) as FraudLogRow[]);
        setError(null);
      }
      setLoading(false);
    };
    load();
  }, []);

  const counts = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.fraud_type] = (acc[log.fraud_type] ?? 0) + 1;
    return acc;
  }, {});

  const pieData = (['Duplicate Payment', 'Invalid Token', 'Expired QR', 'Tampering'] as const)
    .map(name => ({
      name,
      value: counts[name] ?? 0,
      color: chartColorMap[name] ?? '#666',
    }))
    .filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Fraud Monitoring</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">Real-time fraud detection and alert system</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Duplicate TXN" value={counts['Duplicate Payment'] ?? 0} icon={<Copy className="w-4 h-4" />} color="blue" />
        <StatCard title="Invalid Tokens" value={counts['Invalid Token'] ?? 0} icon={<KeyRound className="w-4 h-4" />} color="red" />
        <StatCard title="Expired QR" value={counts['Expired QR'] ?? 0} icon={<Clock className="w-4 h-4" />} color="yellow" />
        <StatCard title="Tampering" value={counts['Tampering'] ?? 0} icon={<Bug className="w-4 h-4" />} color="red" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-surface-900 border border-surface-600 rounded-xl p-5 lg:col-span-1 card-glow">
          <h2 className="text-sm font-semibold text-white mb-4">Fraud Distribution</h2>
          {pieData.length > 0 ? (
            <>
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
            </>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-600 text-xs font-mono">
              No fraud incidents recorded
            </div>
          )}
        </div>

        <div className="bg-surface-900 border border-surface-600 rounded-xl overflow-hidden lg:col-span-2 card-glow">
          <div className="flex items-center justify-between p-4 border-b border-surface-600">
            <h2 className="text-sm font-semibold text-white">Fraud Logs</h2>
            <span className="text-xs font-mono text-cyber-red">{logs.length} incidents</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 border-2 border-cyber-red/30 border-t-cyber-red rounded-full animate-spin" />
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
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fraud Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-cyber-blue">{log.transaction_id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${fraudTypeColors[log.fraud_type] || 'text-gray-400 bg-surface-700'}`}>
                          {log.fraud_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{log.description}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {new Date(log.created_at).toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-600">
                        No fraud incidents yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
