import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { chatService } from '../services/chatService';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState('default');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // AI settings
  const [providers, setProviders] = useState([]);
  const [currentProvider, setCurrentProvider] = useState('gemini');
  const [models, setModels] = useState([]);
  const [currentModel, setCurrentModel] = useState('gemini-2.0-flash');
  const [thinkingLevels, setThinkingLevels] = useState({});
  const [currentThinking, setCurrentThinking] = useState('medium');
  const [serverConnected, setServerConnected] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      const list = await chatService.listSessions();
      setSessions(list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)));
    } catch (e) {
      console.warn('Could not load sessions:', e);
    }
  }, []);

  const switchSession = useCallback(async (sessionId, fallbackProvider, fallbackModel) => {
    try {
      const data = await chatService.switchSession(sessionId);
      setActiveSessionId(sessionId);
      if (Array.isArray(data.history)) {
        setMessages(data.history.map((msg, i) => ({
          id: `msg-${i}-${Date.now()}`,
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content || msg.text || '',
        })));
      } else {
        setMessages([]);
      }
      if (data.settings) {
        if (data.settings.provider) setCurrentProvider(data.settings.provider);
        if (data.settings.model) setCurrentModel(data.settings.model);
        if (data.settings.thinkingLevel) setCurrentThinking(data.settings.thinkingLevel);
      }
      setError(null);
    } catch {
      // If session doesn't exist, create it with active settings
      try {
        await chatService.createSession(sessionId, {
          provider: fallbackProvider || currentProvider,
          model: fallbackModel || currentModel,
          thinkingLevel: currentThinking,
        });
        const data = await chatService.switchSession(sessionId);
        setActiveSessionId(sessionId);
        setMessages([]);
        if (data.settings) {
          if (data.settings.provider) setCurrentProvider(data.settings.provider);
          if (data.settings.model) setCurrentModel(data.settings.model);
          if (data.settings.thinkingLevel) setCurrentThinking(data.settings.thinkingLevel);
        }
      } catch (e2) {
        setActiveSessionId(sessionId);
        setMessages([]);
      }
    }
  }, [currentProvider, currentModel, currentThinking]);

  // Load initial data
  const initialize = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [settings, providersData, levels] = await Promise.all([
        chatService.getSettings().catch(() => null),
        chatService.getProvidersFull().catch(() => ({ providers: [] })),
        chatService.getThinkingLevels().catch(() => ({})),
      ]);

      const provList = providersData?.providers || [];
      setProviders(provList);
      setThinkingLevels(levels);

      const resolvedProvider = settings?.provider || providersData?.defaultProvider || 'gemini';
      const resolvedModel = settings?.model || providersData?.defaultModel || 'gemini-2.0-flash';
      const resolvedThinking = settings?.thinkingLevel || 'medium';

      setCurrentProvider(resolvedProvider);
      setCurrentModel(resolvedModel);
      setCurrentThinking(resolvedThinking);
      setServerConnected(true);

      // Load models for resolved provider
      const foundProv = provList.find(p => (typeof p === 'object' ? p.id : p) === resolvedProvider);
      if (foundProv && typeof foundProv === 'object' && Array.isArray(foundProv.models) && foundProv.models.length > 0) {
        setModels(foundProv.models);
      } else {
        chatService.getModels(resolvedProvider).then(setModels).catch(() => setModels([]));
      }

      await loadSessions();
      await switchSession('default', resolvedProvider, resolvedModel);
    } catch (err) {
      console.error('Init error:', err);
      setServerConnected(false);
      setError('Unable to connect to backend server.');
    }
  }, [isAuthenticated, loadSessions, switchSession]);

  // Re-initialize when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      initialize();
    } else {
      setSessions([]);
      setMessages([]);
      setActiveSessionId('default');
    }
  }, [isAuthenticated, user?.id]);

  const createSession = useCallback(async (name) => {
    await chatService.createSession(name, {
      provider: currentProvider,
      model: currentModel,
      thinkingLevel: currentThinking,
    });
    await loadSessions();
    await switchSession(name);
  }, [currentProvider, currentModel, currentThinking, loadSessions, switchSession]);

  const deleteSession = useCallback(async (name) => {
    await chatService.deleteSession(name);
    await loadSessions();
    if (activeSessionId === name) {
      await switchSession('default');
    }
  }, [activeSessionId, loadSessions, switchSession]);

  const renameSession = useCallback(async (oldName, newName) => {
    await chatService.renameSession(oldName, newName);
    await loadSessions();
    if (activeSessionId === oldName) {
      setActiveSessionId(newName);
    }
  }, [activeSessionId, loadSessions]);

  const duplicateSession = useCallback(async (source) => {
    const target = `${source}-copy-${Date.now()}`;
    await chatService.duplicateSession(source, target);
    await loadSessions();
  }, [loadSessions]);

  const archiveSession = useCallback(async (name) => {
    await chatService.archiveSession(name);
    await loadSessions();
    if (activeSessionId === name) {
      await switchSession('default');
    }
  }, [activeSessionId, loadSessions, switchSession]);

  // Load models when provider changes
  useEffect(() => {
    if (!currentProvider) return;
    const found = providers.find(p => (typeof p === 'object' ? p.id : p) === currentProvider);
    if (found && typeof found === 'object' && Array.isArray(found.models) && found.models.length > 0) {
      setModels(found.models);
      if (!found.models.includes(currentModel)) {
        setCurrentModel(found.defaultModel || found.models[0]);
      }
    } else {
      chatService.getModels(currentProvider)
        .then((modelsList) => {
          setModels(modelsList);
          if (modelsList.length > 0 && !modelsList.includes(currentModel)) {
            setCurrentModel(modelsList[0]);
          }
        })
        .catch(() => setModels([]));
    }
  }, [currentProvider, providers]);

  const changeProvider = useCallback(async (provider) => {
    setCurrentProvider(provider);
    const found = providers.find(p => (typeof p === 'object' ? p.id : p) === provider);
    const defModel = (found && typeof found === 'object' && found.defaultModel)
      ? found.defaultModel
      : (found && typeof found === 'object' && Array.isArray(found.models) ? found.models[0] : '');

    if (defModel) {
      setCurrentModel(defModel);
    }

    try {
      await chatService.updateSettings({ provider, model: defModel || undefined });
    } catch {}
  }, [providers]);

  const changeModel = useCallback(async (model) => {
    setCurrentModel(model);
    try {
      await chatService.updateSettings({ model });
    } catch {}
  }, []);

  const changeThinking = useCallback(async (level) => {
    setCurrentThinking(level);
    try {
      await chatService.updateSettings({ thinkingLevel: level });
    } catch {}
  }, []);

  const sendMessage = useCallback(async (text, options = {}) => {
    if (!text.trim() || isLoading) return;
    setError(null);

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      isVoice: options.isVoice || false,
      files: options.files || [],
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const data = await chatService.ask(text, {
        provider: currentProvider,
        model: currentModel,
        thinkingLevel: currentThinking,
        pdfName: options.pdfName || (options.files?.[0]?.name),
        pdfId: options.pdfId || (options.files?.[0]?.id),
        files: options.files,
      });

      const aiMsg = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'No response received.',
        provider: data.provider || currentProvider,
        model: data.model || currentModel,
        thinkingLevel: data.thinkingLevel,
        citations: data.citations || [],
        pdfUsed: data.pdfUsed || false,
        historyCitations: data.historyCitations || [],
        historyUsed: data.historyUsed || false,
        usage: data.usage,
      };
      setMessages(prev => [...prev, aiMsg]);
      loadSessions();
    } catch (err) {
      const errorData = err.response?.data || {
        friendlyMessage: 'Unable to generate a response.',
        failedProvider: currentProvider,
        providerDisplay: currentProvider ? currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1) : 'AI',
        reason: err.message || 'API request failed.',
        suggestedProvider: currentProvider === 'gemini' ? 'openrouter' : 'gemini',
      };

      const errMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '',
        isError: true,
        errorData,
        errorMessage: errorData.reason || errorData.error || err.message || 'Unable to generate a response right now.',
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, currentProvider, currentModel, currentThinking, loadSessions]);

  const regenerateMessage = useCallback(async (messageId) => {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex < 0) return;

    let userQuestion = '';
    let userOpts = {};
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userQuestion = messages[i].content;
        userOpts = { isVoice: messages[i].isVoice, files: messages[i].files };
        break;
      }
    }
    if (!userQuestion) return;

    setMessages(prev => prev.filter(m => m.id !== messageId));
    await sendMessage(userQuestion, userOpts);
  }, [messages, sendMessage]);

  const clearError = useCallback(() => setError(null), []);

  const value = {
    sessions, activeSessionId, messages, isLoading, error, serverConnected,
    providers, currentProvider, models, currentModel,
    thinkingLevels, currentThinking,
    initialize, loadSessions, switchSession, createSession, deleteSession,
    renameSession, duplicateSession, archiveSession,
    changeProvider, changeModel, changeThinking,
    sendMessage, regenerateMessage, clearError, setMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
