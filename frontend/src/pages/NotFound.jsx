import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-950 px-4">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-surface-950 to-black pointer-events-none" />
      <div className="relative text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-surface-850 border border-zinc-800 flex items-center justify-center mb-6 shadow-xl shadow-black/60">
          <Bot className="w-8 h-8 text-zinc-400" />
        </div>
        <h1 className="text-6xl font-extrabold text-zinc-600 mb-2 tracking-tighter">404</h1>
        <p className="text-lg text-zinc-400 mb-8">Page not found</p>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-semibold shadow-lg shadow-white/5 transition-all"
        >
          <Home className="w-4 h-4 text-zinc-950" /> Back to Chat
        </Link>
      </div>
    </div>
  );
}
