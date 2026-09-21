import React, { useState } from 'react';
import { ChevronDown, Cpu, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function ModelSelector({ providers, currentProvider, onProviderChange, models, currentModel, onModelChange }) {
  const [open, setOpen] = useState(false);

  // Normalize providers array whether it's objects or strings
  const normalizedProviders = (providers || []).map((p) => {
    if (typeof p === 'object' && p !== null) {
      return p;
    }
    return {
      id: p,
      name: p.charAt(0).toUpperCase() + p.slice(1),
      configured: true,
      status: 'ready',
      statusLabel: 'Configured',
    };
  });

  const activeProviderObj = normalizedProviders.find(p => p.id === currentProvider);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-850 border border-zinc-800 hover:border-zinc-700 text-sm transition-all shadow-sm"
        title="Select AI Provider and Model"
      >
        <Cpu className="w-3.5 h-3.5 text-zinc-300" />
        <span className="text-zinc-200 font-medium max-w-[150px] truncate text-xs sm:text-sm">
          {currentModel || (activeProviderObj?.name || currentProvider)}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 right-0 z-50 w-80 bg-surface-850 border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/80 overflow-hidden animate-fade-in">
            {/* AI Provider Section */}
            <div className="p-3 border-b border-zinc-800">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">
                AI Provider
              </label>
              <div className="space-y-1.5">
                {normalizedProviders.map((p) => {
                  const isSelected = currentProvider === p.id;
                  const isConfigured = p.configured;
                  const isOffline = p.status === 'offline';

                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        onProviderChange(p.id);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow'
                          : 'bg-zinc-100 dark:bg-zinc-900/70 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.name || p.id}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px]">
                        {isConfigured && !isOffline ? (
                          <span className={`inline-flex items-center gap-1 ${isSelected ? 'text-zinc-700' : 'text-zinc-400'}`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Available</span>
                          </span>
                        ) : isOffline ? (
                          <span className={`inline-flex items-center gap-1 ${isSelected ? 'text-zinc-500' : 'text-zinc-500'}`}>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Offline</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 ${isSelected ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Not configured</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model Selection */}
            <div className="p-3 max-h-52 overflow-y-auto">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">
                Available Models ({activeProviderObj?.name || currentProvider})
              </label>
              <div className="space-y-1">
                {models.length > 0 ? (
                  models.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        onModelChange(m);
                        setOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                        currentModel === m
                          ? 'bg-zinc-200 text-zinc-950 dark:bg-zinc-800 dark:text-white border border-zinc-300 dark:border-zinc-700 font-semibold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:text-zinc-950 dark:hover:text-zinc-200'
                      }`}
                    >
                      <span className="truncate">{m}</span>
                      {currentModel === m && (
                        <span className="text-[10px] bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-sans font-bold px-1.5 py-0.5 rounded ml-2">Active</span>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 italic px-2 py-1">No models available for this provider</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
