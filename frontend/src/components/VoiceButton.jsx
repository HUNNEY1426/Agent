import React from 'react';
import { Mic, Loader2 } from 'lucide-react';

export default function VoiceButton({ isListening, isTranscribing, isSupported, disabled, onClick }) {
  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isTranscribing}
      className={`relative p-2.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-surface-900 ${
        isListening
          ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 hover:bg-red-500 focus:ring-red-500'
          : isTranscribing
          ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-800 focus:ring-zinc-400'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
      title={isTranscribing ? 'Transcribing...' : isListening ? 'Stop recording & transcribe' : 'Voice input'}
      aria-label={isTranscribing ? 'Transcribing...' : isListening ? 'Stop recording' : 'Start voice input'}
    >
      {isTranscribing ? (
        <Loader2 className="w-[18px] h-[18px] animate-spin text-zinc-200" />
      ) : (
        <Mic className={`w-[18px] h-[18px] ${isListening ? 'animate-pulse' : ''}`} />
      )}
      {isListening && !isTranscribing && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
      )}
    </button>
  );
}
