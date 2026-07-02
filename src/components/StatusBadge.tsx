import type { TransactionStatus } from '../types';

const config: Record<TransactionStatus, { bg: string; text: string; label: string }> = {
  verified: { bg: 'bg-cyber-green/20', text: 'text-cyber-green', label: 'Verified' },
  pending: { bg: 'bg-cyber-yellow/20', text: 'text-cyber-yellow', label: 'Pending' },
  fraud: { bg: 'bg-cyber-red/20', text: 'text-cyber-red', label: 'Fraud' },
};

export default function StatusBadge({ status }: { status: TransactionStatus }) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'verified' ? 'bg-cyber-green' : status === 'pending' ? 'bg-cyber-yellow' : 'bg-cyber-red'}`} />
      {c.label}
    </span>
  );
}
