import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, Building, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { api } from '../../services/api';
import { setAuthenticatedSession } from '../../services/storage';

interface RegisterPageProps {
  onSuccess: () => void;
  onNavigateToLogin: () => void;
  onBackToLanding: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onSuccess,
  onNavigateToLogin,
  onBackToLanding
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [semester, setSemester] = useState(4);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail || !password) {
      setError('Please fill in all required fields (Name, Email, Password).');
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.register({
        name: cleanName,
        email: cleanEmail,
        passwordPlain: password,
        university: university.trim() || 'Institute of Technology',
        department: department.trim() || 'Engineering',
        semester: Number(semester) || 1
      });

      if (!res.token) {
        throw new Error('Registration failed to return an authentication session.');
      }

      setAuthenticatedSession(res.token, res.state);
      showToast('Account registered successfully! Welcome to Syncademic.', 'success');
      onSuccess();
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please verify your details.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col justify-center py-10 sm:px-6 lg:px-8 select-none relative overflow-hidden"
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
          className="inline-flex items-center gap-2.5 mb-5 group cursor-pointer focus:outline-hidden"
        >
          <div className="w-9 h-9 rounded-lg bg-[#1E2022] text-[#FCFBF8] flex items-center justify-center font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
            <span className="text-[#F4C430] font-black text-lg">S</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-[#1E2022]">Syncademic</span>
        </button>
        <h2 className="text-2xl font-bold tracking-tight text-[#1E2022]">
          Create your academic workspace
        </h2>
        <p className="mt-1 text-xs text-[#5A5E65]">
          Setup your college semester, subjects, and attendance threshold
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-[#E8E7E2] rounded-xl shadow-xs">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-[#FFF1F0] border border-[#FADBD8] text-xs text-[#D9381E] flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E2022] mb-1.5">
                  Full Name <span className="text-[#D9381E]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#848A94] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Patel"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:border-[#007FFF] focus:outline-hidden transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2022] mb-1.5">
                  University / College
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-[#848A94] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    disabled={isLoading}
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="e.g. National Institute of Tech"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:border-[#007FFF] focus:outline-hidden transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1.5">
                University Email Address <span className="text-[#D9381E]">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#848A94] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:border-[#007FFF] focus:outline-hidden transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E2022] mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  disabled={isLoading}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. CSE, ECE, Mech"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:border-[#007FFF] focus:outline-hidden transition-colors disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1E2022] mb-1.5">
                  Current Semester
                </label>
                <select
                  value={semester}
                  disabled={isLoading}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:border-[#007FFF] focus:outline-hidden transition-colors disabled:opacity-50"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E2022] mb-1.5">
                  Password <span className="text-[#D9381E]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#848A94] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:border-[#007FFF] focus:outline-hidden transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#848A94] hover:text-[#1E2022]"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2022] mb-1.5">
                  Confirm Password <span className="text-[#D9381E]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#848A94] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isLoading}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:border-[#007FFF] focus:outline-hidden transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-3"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Registration & Start
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-[#5A5E65]">
            Already have an account?{' '}
            <button
              onClick={onNavigateToLogin}
              disabled={isLoading}
              className="font-semibold text-[#007FFF] hover:underline"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
