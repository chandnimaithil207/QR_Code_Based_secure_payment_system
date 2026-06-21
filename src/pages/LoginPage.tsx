import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { error: authError } = isRegister
      ? await signUp(email, password)
      : await signIn(email, password);
    setLoading(false);

    if (authError) {
      setError(authError);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-surface-950 grid-bg flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-cyber-green/5 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-cyber-blue/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-800 border border-cyber-green/30 glow-green mb-4">
            <ShieldCheck className="w-8 h-8 text-cyber-green" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SecureQR</h1>
          <p className="text-sm text-gray-500 mt-1 font-mono">Payment Verification System</p>
        </div>

        {/* Card */}
        <div className="bg-surface-900 border border-surface-700 rounded-2xl p-6 lg:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-4 h-4 text-cyber-blue" />
            <span className="text-xs font-mono text-cyber-blue uppercase tracking-widest">
              {isRegister ? 'Create Account' : 'Secure Access'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="merchant@secureqr.io"
                  className="w-full bg-surface-800 border border-surface-600 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyber-green/50 focus:ring-1 focus:ring-cyber-green/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-surface-800 border border-surface-600 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyber-green/50 focus:ring-1 focus:ring-cyber-green/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-cyber-red/10 border border-cyber-red/30 text-cyber-red text-xs font-mono px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyber-green hover:bg-cyber-green-dark text-surface-950 font-semibold py-2.5 rounded-lg text-sm transition-all duration-200 hover:shadow-lg hover:shadow-cyber-green/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-surface-950/30 border-t-surface-950 rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : isRegister ? 'Register' : 'Login'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-surface-700 text-center">
            <p className="text-sm text-gray-500">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="text-cyber-blue hover:text-cyber-blue-dark ml-1 font-medium transition-colors"
              >
                {isRegister ? 'Login' : 'Register'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6 font-mono">
          End-to-end encrypted &bull; Zero-knowledge verification
        </p>
      </div>
    </div>
  );
}
