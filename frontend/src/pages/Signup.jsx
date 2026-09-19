import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bot, Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup(name, email, password);
      navigate('/chat');
    } catch (err) {
      setError(err.message || 'Signup failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-950 px-4">
      <div className="fixed inset-0 bg-gradient-to-br from-brand-950/50 via-surface-950 to-purple-950/30 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center mb-4 shadow-xl shadow-brand-900/40">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Create account</h1>
          <p className="text-sm text-slate-500 mt-1">Get started with AI Agent</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-800/60 border border-slate-800/80 rounded-2xl p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/50 text-xs text-red-300">{error}</div>
          )}

          <div className="mb-4">
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-850 border border-slate-700/50 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15 transition-all"
                autoFocus
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-850 border border-slate-700/50 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15 transition-all"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-850 border border-slate-700/50 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15 transition-all"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-850 border border-slate-700/50 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15 transition-all"
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-lg shadow-brand-600/25 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Create account</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
