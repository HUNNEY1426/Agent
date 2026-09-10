import React from 'react';
import { Bot, Settings2, Sliders, Menu, Sparkles, Volume2 } from 'lucide-react';

export function Header({
  providers = [],
  currentProvider,
  onProviderChange,
  models = [],
  currentModel,
  onModelChange,
  thinkingLevels = {},
  currentThinking,
  onThinkingChange,
  onOpenVoiceSettings,
  onToggleSidebar,
}) {
  return (
    <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-30">
      {/* Left: Brand & Sidebar toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors md:hidden"
          aria-label="Toggle sessions menu"
          title="Toggle sessions"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm sm:text-base text-white tracking-tight">
                AI Voice Chat
              </h1>
              <span className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> Voice Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Web Speech & Synthesis (Hindi & English)
            </p>
          </div>
        </div>
      </div>

      {/* Middle & Right: Provider, Model, Thinking, and Voice Settings */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Provider dropdown */}
        <div className="flex items-center gap-1">
          <select
            value={currentProvider}
            onChange={(e) => onProviderChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 capitalize transition-colors"
            title="Select AI Provider"
            aria-label="Select AI Provider"
          >
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Model dropdown */}
        <div className="hidden sm:flex items-center gap-1">
          <select
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 max-w-[170px] truncate transition-colors"
            title="Select Model"
            aria-label="Select Model"
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Thinking level dropdown (if supported) */}
        {thinkingLevels && Object.keys(thinkingLevels).length > 0 && (
          <div className="hidden lg:flex items-center gap-1">
            <select
              value={currentThinking}
              onChange={(e) => onThinkingChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
              title="Thinking Level"
              aria-label="Select Thinking Level"
            >
              {Object.entries(thinkingLevels).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label || key}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Voice settings button */}
        <button
          type="button"
          onClick={onOpenVoiceSettings}
          className="inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-medium rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all shadow-sm"
          title="Open Voice & Speech Settings"
          aria-label="Open Voice Settings"
        >
          <Volume2 className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">Voice Settings</span>
        </button>
      </div>
    </header>
  );
}
