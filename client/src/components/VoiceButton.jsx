import React from 'react';
import { Mic, MicOff } from 'lucide-react';

export default function VoiceButton({ isListening, isSupported, disabled, onClick }) {
  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative p-2.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-surface-900 ${
        isListening
          ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 hover:bg-red-500 focus:ring-red-500'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 focus:ring-brand-500'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
      title={isListening ? 'Stop recording' : 'Voice input'}
      aria-label={isListening ? 'Stop recording' : 'Start voice input'}
    >
      <Mic className={`w-[18px] h-[18px] ${isListening ? 'animate-pulse' : ''}`} />
      {isListening && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
      )}
    </button>
  );
}
