import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-950 px-4">
      <div className="fixed inset-0 bg-gradient-to-br from-brand-950/30 via-surface-950 to-purple-950/20 pointer-events-none" />
      <div className="relative text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-surface-800 border border-slate-800 flex items-center justify-center mb-6">
          <Bot className="w-8 h-8 text-slate-600" />
        </div>
        <h1 className="text-6xl font-bold text-slate-700 mb-2">404</h1>
        <p className="text-lg text-slate-500 mb-8">Page not found</p>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium shadow-lg shadow-brand-600/25 transition-all"
        >
          <Home className="w-4 h-4" /> Back to Chat
        </Link>
      </div>
    </div>
  );
}
