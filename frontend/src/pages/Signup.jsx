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
      setError('All fields are required');
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
      await signup(email, password, name);
      navigate('/chat');
    } catch (err) {
      setError(err.message || 'Signup failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-950 px-4">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-surface-950 to-black pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 border border-zinc-700/60 flex items-center justify-center mb-4 shadow-xl shadow-black/50">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Create account</h1>
          <p className="text-sm text-zinc-400 mt-1">Get started with AI Agent</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-900/80 border border-zinc-800 rounded-2xl p-6 shadow-2xl shadow-black/60 backdrop-blur-sm">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">{error}</div>
          )}

          <div className="mb-4">
            <label className="text-xs font-medium text-zinc-300 mb-1.5 block">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-850 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-white/10 transition-all"
                autoFocus
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-zinc-300 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-850 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-white/10 transition-all"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-zinc-300 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-850 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-white/10 transition-all"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-xs font-medium text-zinc-300 mb-1.5 block">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-850 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-white/10 transition-all"
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-sm font-semibold shadow-lg shadow-black/10 dark:shadow-white/5 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-white dark:text-zinc-950" /> : <><span>Create account</span><ArrowRight className="w-4 h-4 text-white dark:text-zinc-950" /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link to="/login" className="text-zinc-200 hover:text-white font-medium underline underline-offset-4 transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
