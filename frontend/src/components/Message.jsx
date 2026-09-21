import React from 'react';
import { Bot, User, Mic, FileText, Brain, AlertCircle, RefreshCw } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import MessageActions from './MessageActions';
import { useChat } from '../context/ChatContext';

export default function Message({ message, onRegenerate, onSpeak, onStopSpeak, isSpeaking }) {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const { changeProvider } = useChat();

  if (isError) {
    const errorData = message.errorData || {};
    const suggested = errorData.suggestedProvider;

    const handleSwitchAndRetry = async () => {
      if (suggested) {
        await changeProvider(suggested);
        if (onRegenerate) {
          onRegenerate(message.id);
        }
      }
    };

    return (
      <div className="flex items-start gap-3 p-4 animate-fade-in">
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-750 flex items-center justify-center shadow-sm">
          <AlertCircle className="w-4 h-4 text-zinc-300" />
        </div>
        <div className="flex-1 min-w-0 max-w-xl">
          <div className="p-3.5 rounded-xl bg-surface-850 border border-zinc-800 space-y-2 shadow-md">
            <p className="text-sm font-semibold text-zinc-200">
              {errorData.friendlyMessage || 'Unable to generate a response.'}
            </p>

            {errorData.providerDisplay && (
              <div className="text-xs text-zinc-400">
                <span className="text-zinc-500">Provider: </span>
                <span className="font-semibold text-zinc-200">{errorData.providerDisplay}</span>
              </div>
            )}

            <div className="text-xs text-zinc-300">
              <span className="text-zinc-500">Reason: </span>
              <span className="text-zinc-300">{errorData.reason || message.errorMessage || 'API authentication or connection failed.'}</span>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex items-center gap-2 flex-wrap">
              {onRegenerate && (
                <button
                  onClick={() => onRegenerate(message.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all font-medium"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              )}

              {suggested && (
                <button
                  onClick={handleSwitchAndRetry}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-zinc-950 bg-white hover:bg-zinc-200 transition-all font-semibold shadow-sm"
                >
                  Try {suggested.charAt(0).toUpperCase() + suggested.slice(1)}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 p-4 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-md ${
        isUser
          ? 'bg-zinc-800 border border-zinc-700'
          : 'bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 border border-zinc-700/60 shadow-black/50'
      }`}>
        {isUser ? <User className="w-4 h-4 text-zinc-300" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'flex justify-end' : ''}`}>
        <div className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-md ${
          isUser
            ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-tr-sm ml-auto border border-zinc-800 dark:border-zinc-200/50'
            : 'bg-surface-850/95 border border-zinc-800/90 text-zinc-200 rounded-tl-sm'
        }`}>
          {/* Meta */}
          <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
            <span className={`font-semibold ${isUser ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'}`}>
              {isUser ? 'You' : (message.model || message.provider || 'AI Assistant')}
            </span>
            <div className="flex items-center gap-1.5">
              {isUser && message.isVoice && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800 font-medium px-1.5 py-0.5 rounded-full">
                  <Mic className="w-2.5 h-2.5" /> Voice
                </span>
              )}
              {!isUser && message.provider && (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {message.provider}
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          {isUser ? (
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-white dark:text-zinc-900 font-normal selection:bg-zinc-700 dark:selection:bg-zinc-300">
              {message.content}
            </div>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}

          {/* PDF Citations */}
          {!isUser && message.pdfUsed && message.citations?.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-xs text-zinc-300 mb-1.5 font-medium">
                <FileText className="w-3.5 h-3.5 text-zinc-400" /> Sources
              </div>
              <div className="flex flex-wrap gap-1.5">
                {message.citations.map((c, i) => {
                  const citationText = typeof c === 'string'
                    ? c
                    : `${c.documentName || c.file || 'PDF'} · Page ${c.pageNumber || c.page || '1'}`;
                  return (
                    <span key={i} className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-700/60 shadow-sm font-mono">
                      📄 {citationText}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* History RAG notification */}
          {!isUser && message.historyUsed && (
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
              <Brain className="w-3 h-3 flex-shrink-0 text-zinc-400" /> Grounded in previous chat conversation history
            </div>
          )}

          {/* Actions */}
          {!isUser && (
            <MessageActions
              message={message}
              onRegenerate={onRegenerate}
              onSpeak={onSpeak}
              onStopSpeak={onStopSpeak}
              isSpeaking={isSpeaking}
            />
          )}
        </div>
      </div>
    </div>
  );
}
