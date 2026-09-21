import React, { useState } from 'react';
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Volume2, Square } from 'lucide-react';

export default function MessageActions({ message, onRegenerate, onSpeak, onStopSpeak, isSpeaking }) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-zinc-800/70">
      {/* Copy */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-medium"
        title="Copy response"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-zinc-200" /> : <Copy className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
      </button>

      {/* Regenerate */}
      {onRegenerate && !message.isError && (
        <button
          onClick={() => onRegenerate(message.id)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-medium"
          title="Regenerate response"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Retry</span>
        </button>
      )}

      {/* TTS */}
      <button
        onClick={() => isSpeaking ? onStopSpeak?.() : onSpeak?.(message.id, message.content)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all font-medium ${
          isSpeaking
            ? 'text-white bg-zinc-800 border border-zinc-700 shadow-sm'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
        }`}
        title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
      >
        {isSpeaking ? <Square className="w-3.5 h-3.5 fill-white" /> : <Volume2 className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{isSpeaking ? 'Stop' : 'Listen'}</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Like / Dislike */}
      <button
        onClick={() => setLiked(liked === 'up' ? null : 'up')}
        className={`p-1.5 rounded-lg transition-all ${liked === 'up' ? 'text-white bg-zinc-800 border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'}`}
        title="Good response"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setLiked(liked === 'down' ? null : 'down')}
        className={`p-1.5 rounded-lg transition-all ${liked === 'down' ? 'text-zinc-200 bg-zinc-800 border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'}`}
        title="Bad response"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
