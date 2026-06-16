import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: 'green' | 'blue' | 'red' | 'yellow';
  trend?: string;
}

const colorMap = {
  green: 'border-cyber-green/20 bg-cyber-green/5',
  blue: 'border-cyber-blue/20 bg-cyber-blue/5',
  red: 'border-cyber-red/20 bg-cyber-red/5',
  yellow: 'border-cyber-yellow/20 bg-cyber-yellow/5',
};

const iconColorMap = {
  green: 'text-cyber-green bg-cyber-green/10',
  blue: 'text-cyber-blue bg-cyber-blue/10',
  red: 'text-cyber-red bg-cyber-red/10',
  yellow: 'text-cyber-yellow bg-cyber-yellow/10',
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
      {trend && <p className="text-xs text-gray-500 mt-1 font-mono">{trend}</p>}
    </div>
  );
}
