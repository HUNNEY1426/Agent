import React, { useState } from 'react';
import { Brain, ChevronDown } from 'lucide-react';

const levelColors = {
  low: 'text-zinc-400',
  medium: 'text-zinc-300',
  high: 'text-zinc-100',
  ultra: 'text-white',
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
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-850 border border-zinc-800 hover:border-zinc-700 text-xs transition-all shadow-sm"
        title="Gemini Thinking Level (Reasoning Effort)"
      >
        <Brain className={`w-3.5 h-3.5 ${levelColors[current] || 'text-zinc-300'}`} />
        <span className="text-zinc-300 capitalize hidden sm:inline">
          {levels[current]?.label || current}
        </span>
        <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 right-0 z-50 w-60 bg-surface-850 border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/80 overflow-hidden animate-fade-in">
            <div className="p-3">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">
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
                        ? 'bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-950 dark:text-white font-medium'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        current === key ? 'bg-zinc-950 dark:bg-white' : 'bg-zinc-400 dark:bg-zinc-600'
                      }`} />
                      <span className={`capitalize ${current === key ? 'text-zinc-950 dark:text-white font-semibold' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {levels[key]?.label || key}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{levels[key]?.description?.split(' ').slice(0, 3).join(' ')}</span>
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
