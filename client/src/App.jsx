import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { Bot, Sparkles, AlertCircle, RefreshCw, Volume2 } from 'lucide-react';

export function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Settings & Providers state
  const [providers, setProviders] = useState(['gemini', 'openai', 'claude', 'ollama', 'openrouter']);
  const [currentProvider, setCurrentProvider] = useState('gemini');
  const [models, setModels] = useState([]);
  const [currentModel, setCurrentModel] = useState('');
  const [thinkingLevels, setThinkingLevels] = useState({});
  const [currentThinking, setCurrentThinking] = useState('none');

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState('default');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Voice settings modal
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Speech Synthesis hook
  const {
    isSpeaking,
    speakingMessageId,
    voices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    rate,
    setRate,
    pitch,
    setPitch,
    volume,
    setVolume,
    speakMessage,
    stopSpeaking,
  } = useSpeechSynthesis();

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initial load: fetch settings, providers, thinking levels, sessions
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // 1. Fetch current settings
      const settingsRes = await fetch('/ai/settings');
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data.provider) setCurrentProvider(data.provider);
        if (data.model) setCurrentModel(data.model);
        if (data.thinkingLevel) setCurrentThinking(data.thinkingLevel);
      }

      // 2. Fetch providers
      const provRes = await fetch('/ai/providers');
      if (provRes.ok) {
        const data = await provRes.json();
        if (Array.isArray(data.providers) && data.providers.length > 0) {
          setProviders(data.providers);
        }
      }

      // 3. Fetch thinking levels
      const thinkRes = await fetch('/ai/thinking-levels');
      if (thinkRes.ok) {
        const data = await thinkRes.json();
        if (data.levels) setThinkingLevels(data.levels);
      }

      // 4. Fetch sessions
      await loadSessions();

      // 5. Switch/load active session history
      await switchSession('default');
    } catch (err) {
      console.error('Error connecting to backend:', err);
      setServerError('Unable to connect to backend server at http://localhost:3000. Please ensure the server is running.');
    }
  };

  // Load models whenever provider changes
  useEffect(() => {
    if (!currentProvider) return;

    const fetchModels = async () => {
      try {
        const res = await fetch(`/ai/models/${currentProvider}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.models)) {
            setModels(data.models);
            if (!data.models.includes(currentModel) && data.models.length > 0) {
              setCurrentModel(data.models[0]);
            }
          }
        }
      } catch (e) {
        console.warn('Could not fetch models for provider:', currentProvider);
      }
    };

    fetchModels();
  }, [currentProvider]);

  const loadSessions = async () => {
    try {
      const res = await fetch('/ai/chat/list');
      if (res.ok) {
        const list = await res.json();
        setSessions(list);
      }
    } catch (e) {
      console.warn('Could not load sessions:', e);
    }
  };

  const switchSession = async (sessionId) => {
    try {
      const res = await fetch('/ai/chat/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sessionId }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveSessionId(sessionId);
        if (Array.isArray(data.history)) {
          setMessages(
            data.history.map((msg, i) => ({
              id: `msg-${i}-${Date.now()}`,
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content || msg.text || '',
            }))
          );
        }
        if (data.settings) {
          if (data.settings.provider) setCurrentProvider(data.settings.provider);
          if (data.settings.model) setCurrentModel(data.settings.model);
          if (data.settings.thinkingLevel) setCurrentThinking(data.settings.thinkingLevel);
        }
      }
    } catch (err) {
      console.warn('Could not switch session:', err);
    }
  };

  const createSession = async (name) => {
    try {
      const res = await fetch('/ai/chat/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          provider: currentProvider,
          model: currentModel,
          thinkingLevel: currentThinking,
        }),
      });

      if (res.ok) {
        await loadSessions();
        await switchSession(name);
      }
    } catch (err) {
      alert(`Error creating session: ${err.message}`);
    }
  };

  const deleteSession = async (name) => {
    try {
      const res = await fetch(`/ai/chat/delete/${name}`, { method: 'DELETE' });
      if (res.ok) {
        await loadSessions();
        if (activeSessionId === name) {
          await switchSession('default');
        }
      }
    } catch (err) {
      alert(`Error deleting session: ${err.message}`);
    }
  };

  // Provider change handler
  const handleProviderChange = async (newProvider) => {
    setCurrentProvider(newProvider);
    try {
      await fetch('/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: newProvider }),
      });
    } catch (e) {
      console.warn('Failed to sync settings:', e);
    }
  };

  // Model change handler
  const handleModelChange = async (newModel) => {
    setCurrentModel(newModel);
    try {
      await fetch('/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: newModel }),
      });
    } catch (e) {
      console.warn('Failed to sync model:', e);
    }
  };

  // Thinking level change handler
  const handleThinkingChange = async (newThinking) => {
    setCurrentThinking(newThinking);
    try {
      await fetch('/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thinkingLevel: newThinking }),
      });
    } catch (e) {
      console.warn('Failed to sync thinking level:', e);
    }
  };

  // Send message
  const handleSendMessage = async (text, { isVoice = false } = {}) => {
    if (!text.trim() || isLoading) return;

    setServerError(null);

    const userMessageId = `user-${Date.now()}`;
    const newUserMessage = {
      id: userMessageId,
      role: 'user',
      content: text,
      isVoice,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: text,
          provider: currentProvider,
          model: currentModel,
          thinkingLevel: currentThinking,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Server error processing request');
      }

      const aiMessageId = `ai-${Date.now()}`;
      const newAIMessage = {
        id: aiMessageId,
        role: 'assistant',
        content: data.answer || 'No response returned from AI provider.',
        provider: data.provider || currentProvider,
        model: data.model || currentModel,
        thinkingLevel: data.thinkingLevel,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newAIMessage]);
      // Refresh session count
      loadSessions();
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Error: ${err.message}`,
        provider: currentProvider,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sessions Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          switchSession(id);
          setIsSidebarOpen(false);
        }}
        onCreateSession={createSession}
        onDeleteSession={deleteSession}
        onRefreshSessions={loadSessions}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Navigation Bar */}
        <Header
          providers={providers}
          currentProvider={currentProvider}
          onProviderChange={handleProviderChange}
          models={models}
          currentModel={currentModel}
          onModelChange={handleModelChange}
          thinkingLevels={thinkingLevels}
          currentThinking={currentThinking}
          onThinkingChange={handleThinkingChange}
          onOpenVoiceSettings={() => setIsVoiceModalOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Server connection error alert */}
        {serverError && (
          <div className="m-3 p-3 bg-red-950/80 border border-red-800 rounded-xl flex items-center justify-between text-xs text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{serverError}</span>
            </div>
            <button
              onClick={fetchInitialData}
              className="inline-flex items-center gap-1 px-2 py-1 bg-red-900/60 hover:bg-red-800 rounded-lg text-red-100 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-2">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-600/10">
                <Bot className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                AI Voice Chatbot
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Type your questions or speak using the microphone button below.
                You can switch between English and Hindi speech recognition anytime.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left text-xs">
                <div
                  onClick={() => handleSendMessage("What is JavaScript and how does it work?")}
                  className="p-3 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 rounded-xl cursor-pointer transition-all hover:border-slate-700"
                >
                  <p className="font-semibold text-indigo-300 mb-1">English Voice Prompt</p>
                  <p className="text-slate-400">"What is JavaScript and how does it work?"</p>
                </div>
                <div
                  onClick={() => handleSendMessage("नमस्ते, आर्टिफिशियल इंटेलिजेंस क्या है?")}
                  className="p-3 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 rounded-xl cursor-pointer transition-all hover:border-slate-700"
                >
                  <p className="font-semibold text-emerald-300 mb-1">Hindi Voice Prompt</p>
                  <p className="text-slate-400">"नमस्ते, आर्टिफिशियल इंटेलिजेंस क्या है?"</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onSpeak={speakMessage}
                onStopSpeak={stopSpeaking}
                isSpeakingThis={isSpeaking && speakingMessageId === msg.id}
              />
            ))
          )}

          {/* AI Thinking / Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-3 p-4 text-slate-400 text-sm animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 flex items-center justify-center text-indigo-400">
                <Bot className="w-5 h-5 animate-spin" />
              </div>
              <div className="flex items-center gap-2">
                <span>AI is thinking</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></span>
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
          placeholder="Ask anything in English or Hindi, or click the mic to speak..."
        />
      </div>

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        voices={voices}
        selectedVoiceURI={selectedVoiceURI}
        onSelectVoice={setSelectedVoiceURI}
        rate={rate}
        onChangeRate={setRate}
        pitch={pitch}
        onChangePitch={setPitch}
        volume={volume}
        onChangeVolume={setVolume}
        onTestVoice={(text) => speakMessage('test-voice', text)}
      />
    </div>
  );
}
