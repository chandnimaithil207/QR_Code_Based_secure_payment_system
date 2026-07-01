import {
  LayoutDashboard,
  QrCode,
  ArrowLeftRight,
  ScanLine,
  ShieldAlert,
  LogOut,
  X,
  ShieldCheck,
  Bell,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/generate-qr', icon: QrCode, label: 'Generate QR' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/screenshot-verify', icon: ScanLine, label: 'Screenshot Verify' },
  { to: '/fraud-alerts', icon: ShieldAlert, label: 'Fraud Alerts' },
  { to: '/notification-settings', icon: Bell, label: 'Notifications' },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signOut } = useAuth();

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-surface-900 border-r border-surface-700 z-50
          transition-transform duration-300 lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-cyber-green" />
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">SecureQR</h1>
              <p className="text-[10px] text-cyber-green/70 font-mono uppercase tracking-widest">Payment Verify</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 flex-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-800'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-surface-700">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm font-medium text-gray-400 hover:text-cyber-red hover:bg-cyber-red/10 transition-all duration-200"
          >
            <LogOut className="w-4.5 h-4.5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
