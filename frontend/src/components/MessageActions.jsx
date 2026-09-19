import React, { useState } from 'react';
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Volume2, Square, AlertCircle } from 'lucide-react';

export default function MessageActions({ message, onRegenerate, onSpeak, onStopSpeak, isSpeaking }) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-800/50">
      {/* Copy */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all"
        title="Copy response"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
      </button>

      {/* Regenerate */}
      {onRegenerate && !message.isError && (
        <button
          onClick={() => onRegenerate(message.id)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all"
          title="Regenerate response"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Retry</span>
        </button>
      )}

      {/* TTS */}
      <button
        onClick={() => isSpeaking ? onStopSpeak?.() : onSpeak?.(message.id, message.content)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
          isSpeaking
            ? 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
        }`}
        title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
      >
        {isSpeaking ? <Square className="w-3.5 h-3.5 fill-amber-400" /> : <Volume2 className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{isSpeaking ? 'Stop' : 'Listen'}</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Like / Dislike */}
      <button
        onClick={() => setLiked(liked === 'up' ? null : 'up')}
        className={`p-1.5 rounded-lg transition-all ${liked === 'up' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'}`}
        title="Good response"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setLiked(liked === 'down' ? null : 'down')}
        className={`p-1.5 rounded-lg transition-all ${liked === 'down' ? 'text-red-400 bg-red-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'}`}
        title="Bad response"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
