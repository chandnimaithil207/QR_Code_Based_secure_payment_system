import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './hooks/useAuth';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import GenerateQRPage from './pages/GenerateQRPage';
import CustomerPaymentPage from './pages/CustomerPaymentPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import ScreenshotVerifyPage from './pages/ScreenshotVerifyPage';
import FraudMonitoringPage from './pages/FraudMonitoringPage';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-cyber-red/30 rounded-xl p-6 max-w-md text-center">
            <h2 className="text-lg font-bold text-cyber-red mb-2">Runtime Error</h2>
            <p className="text-sm text-gray-400 mb-4 font-mono">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-cyber-green text-surface-950 px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/generate-qr" element={<GenerateQRPage />} />
            <Route path="/customer-payment" element={<CustomerPaymentPage />} />
            <Route path="/transactions" element={<TransactionHistoryPage />} />
            <Route path="/screenshot-verify" element={<ScreenshotVerifyPage />} />
            <Route path="/fraud-alerts" element={<FraudMonitoringPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}
