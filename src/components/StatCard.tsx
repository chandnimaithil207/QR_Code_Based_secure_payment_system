import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: 'green' | 'blue' | 'red' | 'yellow';
  trend?: string;
}

const colorMap = {
  green: 'border-cyber-green/40 bg-cyber-green/15',
  blue: 'border-cyber-blue/40 bg-cyber-blue/15',
  red: 'border-cyber-red/40 bg-cyber-red/15',
  yellow: 'border-cyber-yellow/40 bg-cyber-yellow/15',
};

const iconColorMap = {
  green: 'text-cyber-green bg-cyber-green/20',
  blue: 'text-cyber-blue bg-cyber-blue/20',
  red: 'text-cyber-red bg-cyber-red/20',
  yellow: 'text-cyber-yellow bg-cyber-yellow/20',
};

export default function StatCard({ title, value, icon, color, trend }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-4 lg:p-5 transition-all duration-300 hover:scale-[1.02] ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconColorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl lg:text-3xl font-bold text-white font-mono">{value.toLocaleString()}</div>
      {trend && <p className="text-xs text-gray-400 mt-1 font-mono">{trend}</p>}
    </div>
  );
}
