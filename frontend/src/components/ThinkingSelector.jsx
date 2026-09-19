import React, { useState } from 'react';
import { Brain, ChevronDown } from 'lucide-react';

const levelColors = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  ultra: 'text-red-400',
};

export default function ThinkingSelector({ levels, current, onChange, provider = 'gemini' }) {
  const [open, setOpen] = useState(false);

  // Thinking level is supported for Gemini and OpenRouter
  const supportsThinking = ['gemini', 'openrouter', 'openai'].includes(provider?.toLowerCase());
  if (!supportsThinking) {
    return null;
  }

  const levelKeys = Object.keys(levels || {});
  if (levelKeys.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-800 border border-slate-700/50 hover:border-slate-600 text-xs transition-all"
        title="Gemini Thinking Level (Reasoning Effort)"
      >
        <Brain className={`w-3.5 h-3.5 ${levelColors[current] || 'text-brand-400'}`} />
        <span className="text-slate-300 capitalize hidden sm:inline">
          {levels[current]?.label || current}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 right-0 z-50 w-60 bg-surface-800 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-fade-in">
            <div className="p-3">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
                Thinking / Reasoning Effort
              </label>
              <div className="space-y-1">
                {levelKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      onChange(key);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                      current === key
                        ? 'bg-brand-600/15 border border-brand-500/30 text-brand-300'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        current === key ? 'bg-brand-400' : 'bg-slate-600'
                      }`} />
                      <span className={`capitalize font-medium ${current === key ? 'text-brand-300' : 'text-slate-200'}`}>
                        {levels[key]?.label || key}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">{levels[key]?.description?.split(' ').slice(0, 3).join(' ')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
