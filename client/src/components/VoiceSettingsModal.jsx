import React from 'react';
import { X, Volume2, RotateCcw, Play } from 'lucide-react';

export function VoiceSettingsModal({
  isOpen,
  onClose,
  voices = [],
  selectedVoiceURI,
  onSelectVoice,
  rate,
  onChangeRate,
  pitch,
  onChangePitch,
  volume,
  onChangeVolume,
  onTestVoice,
}) {
  if (!isOpen) return null;

  const handleReset = () => {
    onChangeRate(1.0);
    onChangePitch(1.0);
    onChangeVolume(1.0);
    onSelectVoice('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">Voice & Audio Settings</h3>
              <p className="text-xs text-slate-400">Configure speech synthesis output</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Controls */}
        <div className="py-4 space-y-5">
          {/* Voice selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Preferred Voice
            </label>
            <select
              value={selectedVoiceURI}
              onChange={(e) => onSelectVoice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Auto-select (Hindi for Hindi, English for English)</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Leaves auto-detection active if left on default.
            </p>
          </div>

          {/* Speed / Rate slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
              <span>Speech Speed (Rate)</span>
              <span className="font-mono text-indigo-400">{rate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={rate}
              onChange={(e) => onChangeRate(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0.5x (Slow)</span>
              <span>1.0x (Normal)</span>
              <span>2.0x (Fast)</span>
            </div>
          </div>

          {/* Pitch slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
              <span>Pitch</span>
              <span className="font-mono text-indigo-400">{pitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={pitch}
              onChange={(e) => onChangePitch(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Low</span>
              <span>Default</span>
              <span>High</span>
            </div>
          </div>

          {/* Volume slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
              <span>Volume</span>
              <span className="font-mono text-indigo-400">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTestVoice("नमस्ते, Voice chat successfully configured!")}
              className="inline-flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl transition-colors font-medium border border-slate-700/60"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              <span>Test Voice</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-md shadow-indigo-600/30"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
