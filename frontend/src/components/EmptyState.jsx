import React from 'react';
import { Bot, Code, FileText, Search, Sparkles } from 'lucide-react';

const suggestions = [
  { icon: Sparkles, text: 'Explain a programming concept', color: 'text-zinc-300' },
  { icon: FileText, text: 'Analyze my PDF document', color: 'text-zinc-300' },
  { icon: Code, text: 'Help me debug my code', color: 'text-zinc-300' },
  { icon: Search, text: 'Search my previous chats', color: 'text-zinc-300' },
];

export default function EmptyState({ onSuggestionClick }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 border border-zinc-700/60 flex items-center justify-center mb-5 shadow-2xl shadow-black/60">
          <Bot className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-zinc-100 mb-2 tracking-tight">AI Assistant</h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          How can I help you today?
        </p>

        {/* Suggestions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
          {suggestions.map((item, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick?.(item.text)}
              className="group p-3.5 rounded-xl bg-surface-850/80 border border-zinc-800/90 hover:border-zinc-600 hover:bg-surface-800 transition-all duration-200 text-left shadow-sm"
            >
              <item.icon className={`w-4 h-4 ${item.color} mb-2 group-hover:scale-110 group-hover:text-white transition-all`} />
              <p className="text-sm text-zinc-300 group-hover:text-white transition-colors font-medium">{item.text}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
