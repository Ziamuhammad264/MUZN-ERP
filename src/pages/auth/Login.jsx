import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FormField } from '../../components/ui/FormField';
import { Eye, EyeOff, Lock, Mail, ShieldAlert } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    
    setLoading(true);
    setError('');

    const res = await login(email, password);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0F172A] p-4 font-sans transition-colors duration-250">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden p-8 animate-fade-in">
        
        {/* Logo and Headings */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-brand-light dark:bg-brand-dark text-white font-bold text-2xl font-heading mb-3 shadow-md">
            M
          </div>
          <h2 className="text-xl font-bold font-heading text-slate-850 dark:text-slate-100">
            Welcome to MUZN ERP
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
            Log in to manage riders, fleet, payroll, and financials
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Email Address" required>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-405 dark:text-slate-500">
                <Mail size={15} />
              </span>
              <input
                type="email"
                required
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light focus:border-brand-light dark:focus:ring-brand-dark dark:focus:border-brand-dark text-slate-800 dark:text-slate-100 placeholder-slate-400"
                placeholder="you@muzn.ae"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </FormField>

          <FormField label="Password" required>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-405 dark:text-slate-500">
                <Lock size={15} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light focus:border-brand-light dark:focus:ring-brand-dark dark:focus:border-brand-dark text-slate-800 dark:text-slate-100 placeholder-slate-400"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-250 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </FormField>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            ) : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
};
