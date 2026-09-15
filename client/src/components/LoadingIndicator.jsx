import React from 'react';
import { Bot } from 'lucide-react';

export default function LoadingIndicator() {
  return (
    <div className="flex items-start gap-3 p-4 animate-fade-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-brand-900/30">
        <Bot className="w-4.5 h-4.5 animate-pulse" />
      </div>
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>AI Agent is thinking</span>
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce-dot" />
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce-dot [animation-delay:0.16s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce-dot [animation-delay:0.32s]" />
          </span>
        </div>
        <div className="flex gap-2">
          <div className="h-2.5 w-48 bg-slate-800 rounded-full animate-pulse" />
          <div className="h-2.5 w-32 bg-slate-800 rounded-full animate-pulse [animation-delay:0.2s]" />
        </div>
        <div className="h-2.5 w-64 bg-slate-800 rounded-full animate-pulse [animation-delay:0.4s]" />
      </div>
    </div>
  );
}
