import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { api } from '../../services/api';
import { setAuthenticatedSession } from '../../services/storage';

interface LoginPageProps {
  onSuccess: () => void;
  onNavigateToRegister: () => void;
  onBackToLanding: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onNavigateToRegister,
  onBackToLanding
}) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.login({
        email: cleanEmail,
        passwordPlain: password
      });

      if (!res.token) {
        throw new Error('Authentication response did not contain a valid session token.');
      }

      setAuthenticatedSession(res.token, res.state);
      showToast('Welcome back to Syncademic!', 'success');
      onSuccess();
    } catch (err: any) {
      const msg = err.message || 'Invalid email or password.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('aarav.sharma@university.edu');
    setPassword('password123');
    setIsLoading(true);
    setError('');
    try {
      const res = await api.auth.login({
        email: 'aarav.sharma@university.edu',
        passwordPlain: 'password123'
      });

      if (!res.token) {
        throw new Error('Demo authentication failed');
      }

      setAuthenticatedSession(res.token, res.state);
      showToast('Logged in as Aarav Sharma (Demo Profile)', 'success');
      onSuccess();
    } catch (err: any) {
      setError('Demo student login failed: ' + err.message);
      showToast('Demo login failed: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 select-none relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-main, #FCFBF8)' }}
    >
      {/* Background Grid & Ambient Layers */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-grid-pattern opacity-80" 
        aria-hidden="true" 
      />
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-ambient-radial" 
        aria-hidden="true" 
      />

      <div className="relative z-10">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2.5 mb-6 group cursor-pointer focus:outline-hidden"
        >
          <div className="w-9 h-9 rounded-lg bg-[#1E2022] text-[#FCFBF8] flex items-center justify-center font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
            <span className="text-[#F4C430] font-black text-lg">S</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-[#1E2022]">Syncademic</span>
        </button>
        <h2 className="text-2xl font-bold tracking-tight text-[#1E2022]">
          Sign in to your academic workspace
        </h2>
        <p className="mt-1.5 text-xs text-[#5A5E65]">
          Manage attendance, smart notes, and semester schedules
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-[#E8E7E2] rounded-xl shadow-xs">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-[#FFF1F0] border border-[#FADBD8] text-xs text-[#D9381E] flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1.5">
                University Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#848A94] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  disabled={isLoading}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:border-[#007FFF] focus:outline-hidden transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#1E2022]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => showToast('Password reset link sent to registered email address', 'info')}
                  className="text-[11px] text-[#007FFF] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#848A94] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  disabled={isLoading}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:border-[#007FFF] focus:outline-hidden transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848A94] hover:text-[#1E2022]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-[#E8E7E2] text-[#1E2022] focus:ring-0"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs text-[#5A5E65]">
                Keep me signed in on this device
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-[#E8E7E2]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs font-medium"
              disabled={isLoading}
              onClick={handleDemoLogin}
            >
              ⚡ Instant 1-Click Demo Student Access
            </Button>
          </div>

          <div className="mt-6 text-center text-xs text-[#5A5E65]">
            Don&apos;t have an account yet?{' '}
            <button
              onClick={onNavigateToRegister}
              disabled={isLoading}
              className="font-semibold text-[#007FFF] hover:underline"
            >
              Create student account
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
