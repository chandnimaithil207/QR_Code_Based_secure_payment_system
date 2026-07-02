import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userEmail } = useAuth();

  return (
    <div className="min-h-screen bg-surface-950 grid-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-64 min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 bg-surface-900/80 backdrop-blur-xl border-b border-surface-600">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden lg:block" />

            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse-glow" />
              <span className="text-xs font-mono text-gray-400">
                {userEmail || 'merchant@secureqr.io'}
              </span>
              <div className="w-8 h-8 rounded-full bg-surface-600 flex items-center justify-center text-xs font-bold text-cyber-green">
                {userEmail?.[0]?.toUpperCase() || 'M'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
