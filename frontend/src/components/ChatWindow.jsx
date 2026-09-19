import React, { useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import Message from './Message';
import LoadingIndicator from './LoadingIndicator';
import EmptyState from './EmptyState';
import ChatInput from './ChatInput';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ChatWindow() {
  const {
    messages, isLoading, error, serverConnected,
    sendMessage, regenerateMessage, clearError, initialize,
  } = useChat();

  const {
    isSpeaking, speakingMessageId,
    speakMessage, stopSpeaking,
  } = useSpeechSynthesis();

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSuggestion = (text) => {
    sendMessage(text);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Connection error */}
      {!serverConnected && (
        <div className="mx-3 mt-3 p-3 bg-red-950/60 border border-red-800/50 rounded-xl flex items-center justify-between text-xs text-red-300 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error || 'Unable to connect to backend server.'}</span>
          </div>
          <button onClick={initialize} className="flex items-center gap-1 px-2.5 py-1 bg-red-900/50 hover:bg-red-800/60 rounded-lg text-red-200 transition-colors">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isLoading ? (
          <EmptyState onSuggestionClick={handleSuggestion} />
        ) : (
          <div className="max-w-3xl mx-auto py-4">
            {messages.map(msg => (
              <Message
                key={msg.id}
                message={msg}
                onRegenerate={regenerateMessage}
                onSpeak={speakMessage}
                onStopSpeak={stopSpeaking}
                isSpeaking={isSpeaking && speakingMessageId === msg.id}
              />
            ))}
            {isLoading && <LoadingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSendMessage={(text, opts) => sendMessage(text, opts)}
        disabled={isLoading}
      />
    </div>
  );
}
