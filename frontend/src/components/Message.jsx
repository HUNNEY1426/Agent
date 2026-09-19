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
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-amber-950/60 border border-amber-800/50 flex items-center justify-center shadow-sm">
          <AlertCircle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0 max-w-xl">
          <div className="p-3.5 rounded-xl bg-surface-800/95 border border-amber-900/40 space-y-2 shadow-md">
            <p className="text-sm font-semibold text-amber-300">
              {errorData.friendlyMessage || 'Unable to generate a response.'}
            </p>

            {errorData.providerDisplay && (
              <div className="text-xs text-slate-400">
                <span className="text-slate-500">Provider: </span>
                <span className="font-semibold text-slate-200">{errorData.providerDisplay}</span>
              </div>
            )}

            <div className="text-xs text-slate-300">
              <span className="text-slate-500">Reason: </span>
              <span className="text-slate-300">{errorData.reason || message.errorMessage || 'API authentication or connection failed.'}</span>
            </div>

            <div className="pt-2 border-t border-slate-700/40 flex items-center gap-2 flex-wrap">
              {onRegenerate && (
                <button
                  onClick={() => onRegenerate(message.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-300 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/40 transition-all font-medium"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              )}

              {suggested && (
                <button
                  onClick={handleSwitchAndRetry}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-brand-300 bg-brand-900/30 hover:bg-brand-900/50 border border-brand-700/40 transition-all font-medium"
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
          ? 'bg-surface-700 border border-slate-700'
          : 'bg-gradient-to-br from-brand-600 to-purple-600'
      }`}>
        {isUser ? <User className="w-4 h-4 text-slate-300" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'flex justify-end' : ''}`}>
        <div className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-md ${
          isUser
            ? 'bg-brand-600/95 text-white rounded-tr-sm ml-auto'
            : 'bg-surface-800/90 border border-slate-800/80 text-slate-200 rounded-tl-sm'
        }`}>
          {/* Meta */}
          <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
            <span className={`font-medium ${isUser ? 'text-brand-200' : 'text-slate-400'}`}>
              {isUser ? 'You' : (message.model || message.provider || 'AI Assistant')}
            </span>
            <div className="flex items-center gap-1.5">
              {isUser && message.isVoice && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">
                  <Mic className="w-2.5 h-2.5" /> Voice
                </span>
              )}
              {!isUser && message.provider && (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-400 border border-slate-700/40">
                  {message.provider}
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          {isUser ? (
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}

          {/* PDF Citations */}
          {!isUser && message.pdfUsed && message.citations?.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-700/40">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-1.5 font-medium">
                <FileText className="w-3.5 h-3.5" /> Sources
              </div>
              <div className="flex flex-wrap gap-1.5">
                {message.citations.map((c, i) => {
                  const citationText = typeof c === 'string'
                    ? c
                    : `${c.documentName || c.file || 'PDF'} · Page ${c.pageNumber || c.page || '1'}`;
                  return (
                    <span key={i} className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 shadow-sm font-mono">
                      📄 {citationText}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* History RAG notification */}
          {!isUser && message.historyUsed && (
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-purple-400 font-medium">
              <Brain className="w-3 h-3 flex-shrink-0" /> Grounded in previous chat conversation history
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
