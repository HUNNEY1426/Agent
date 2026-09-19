import React from 'react';
import { Bot, Code, FileText, Search, Sparkles } from 'lucide-react';

const suggestions = [
  { icon: Sparkles, text: 'Explain a programming concept', color: 'text-amber-400' },
  { icon: FileText, text: 'Analyze my PDF document', color: 'text-emerald-400' },
  { icon: Code, text: 'Help me debug my code', color: 'text-blue-400' },
  { icon: Search, text: 'Search my previous chats', color: 'text-purple-400' },
];

export default function EmptyState({ onSuggestionClick }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center mb-5 shadow-xl shadow-brand-900/30">
          <Bot className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-slate-100 mb-2">AI Assistant</h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-8">
          How can I help you today?
        </p>

        {/* Suggestions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
          {suggestions.map((item, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick?.(item.text)}
              className="group p-3.5 rounded-xl bg-surface-800/80 border border-slate-800/80 hover:border-slate-700 hover:bg-surface-700 transition-all duration-200 text-left"
            >
              <item.icon className={`w-4 h-4 ${item.color} mb-2 group-hover:scale-110 transition-transform`} />
              <p className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">{item.text}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
