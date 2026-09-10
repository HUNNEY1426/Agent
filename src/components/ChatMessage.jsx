import React, { useState } from 'react';
import { Volume2, Square, Copy, Check, Bot, User, Mic, Sparkles } from 'lucide-react';

export function ChatMessage({
  message,
  onSpeak,
  onStopSpeak,
  isSpeakingThis,
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || message.text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeak = () => {
    if (isSpeakingThis) {
      onStopSpeak();
    } else {
      onSpeak(message.id, message.content || message.text || '');
    }
  };

  // Simple clean markdown renderer for preview (handling bold, italics, code blocks, lists)
  const renderFormattedContent = (content) => {
    if (!content) return null;

    // Split code blocks ```lang ... ```
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const firstLineEnd = part.indexOf('\n');
        const lang = firstLineEnd !== -1 ? part.slice(3, firstLineEnd).trim() : '';
        const code = firstLineEnd !== -1 ? part.slice(firstLineEnd + 1, -3) : part.slice(3, -3);

        return (
          <div key={index} className="my-3 rounded-xl overflow-hidden bg-slate-950/80 border border-slate-800">
            {lang && (
              <div className="px-4 py-1.5 text-xs text-slate-400 bg-slate-900/90 border-b border-slate-800/80 font-mono flex items-center justify-between">
                <span>{lang}</span>
              </div>
            )}
            <pre className="p-3.5 text-xs sm:text-sm text-emerald-300 font-mono overflow-x-auto leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Format inline bold, italics, code
      return (
        <div key={index} className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
          {part}
        </div>
      );
    });
  };

  return (
    <div
      className={`group flex w-full gap-3 sm:gap-4 p-4 transition-colors ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-900/30">
          <Bot className="w-5 h-5" />
        </div>
      )}

      {/* Message Content Bubble */}
      <div
        className={`relative max-w-[88%] sm:max-w-[78%] rounded-2xl p-4 shadow-md transition-all ${
          isUser
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-sm shadow-indigo-950/30'
            : 'bg-slate-900/90 border border-slate-800/90 text-slate-200 rounded-tl-sm shadow-slate-950/40'
        }`}
      >
        {/* Header meta info */}
        <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
          <span className={`font-semibold tracking-wide ${isUser ? 'text-indigo-200' : 'text-slate-400'}`}>
            {isUser ? 'You' : (message.model || message.provider || 'AI Assistant')}
          </span>

          <div className="flex items-center gap-2">
            {/* Voice Input Badge if message was sent via speech */}
            {isUser && message.isVoice && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-500/30 text-indigo-100 border border-indigo-400/30 px-2 py-0.5 rounded-full" title="Spoken via voice input">
                <Mic className="w-3 h-3 text-indigo-200" />
                <span>Voice</span>
              </span>
            )}

            {/* Provider badge for AI response */}
            {!isUser && message.provider && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                {message.provider}
              </span>
            )}
          </div>
        </div>

        {/* Text Body */}
        <div className="break-words">
          {renderFormattedContent(message.content || message.text || '')}
        </div>

        {/* Bottom Actions Bar for AI Response */}
        {!isUser && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            {/* Left: Speaker Button (Listen / Speaking state) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSpeak}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  isSpeakingThis
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border border-slate-700/60 hover:bg-slate-700 hover:text-white'
                }`}
                title={isSpeakingThis ? "Stop speaking" : "Listen to response (Read Aloud)"}
                aria-label={isSpeakingThis ? "Stop speaking response" : "Listen to response"}
              >
                {isSpeakingThis ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>Speaking...</span>
                    {/* Animated Waveform */}
                    <div className="flex items-center gap-0.5 h-3 ml-0.5">
                      <span className="wave-bar w-0.5 bg-amber-400 rounded-full"></span>
                      <span className="wave-bar w-0.5 bg-amber-400 rounded-full"></span>
                      <span className="wave-bar w-0.5 bg-amber-400 rounded-full"></span>
                      <span className="wave-bar w-0.5 bg-amber-400 rounded-full"></span>
                    </div>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Listen</span>
                  </>
                )}
              </button>

              {isSpeakingThis && (
                <span className="text-[11px] text-amber-400/80 italic hidden sm:inline">
                  (Click to stop)
                </span>
              )}
            </div>

            {/* Right: Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="Copy response to clipboard"
              aria-label="Copy response"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shadow-md">
          <User className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}
