import api from './api';

export const chatService = {
  async ask(question, options = {}) {
    const { data } = await api.post('/ai/ask', {
      question,
      provider: options.provider,
      model: options.model,
      thinkingLevel: options.thinkingLevel,
      pdfName: options.pdfName,
      pdfId: options.pdfId,
      files: options.files,
      pdf: options.pdf,
      sessionId: options.sessionId,
    });
    return data;
  },

  async getSettings() {
    const { data } = await api.get('/ai/settings');
    return data;
  },

  async updateSettings(settings) {
    const { data } = await api.post('/ai/settings', settings);
    return data;
  },

  async getProviders() {
    const { data } = await api.get('/ai/providers');
    return data.providers || [];
  },

  async getProvidersFull() {
    const { data } = await api.get('/ai/providers');
    return data;
  },

  async getModels(provider) {
    const { data } = await api.get(`/ai/models/${provider}`);
    return data.models || [];
  },

  async getThinkingLevels() {
    const { data } = await api.get('/ai/thinking-levels');
    return data.levels || {};
  },

  async listSessions() {
    const { data } = await api.get('/ai/chat/list');
    return Array.isArray(data) ? data : [];
  },

  async createSession(name, options = {}) {
    const { data } = await api.post('/ai/chat/new', {
      name,
      provider: options.provider,
      model: options.model,
      thinkingLevel: options.thinkingLevel,
    });
    return data;
  },

  async switchSession(name) {
    const { data } = await api.post('/ai/chat/switch', { name });
    return data;
  },

  async deleteSession(name) {
    const { data } = await api.delete(`/ai/chat/delete/${name}`);
    return data;
  },

  async renameSession(oldName, newName) {
    const { data } = await api.post('/ai/chat/rename', { oldName, newName });
    return data;
  },

  async clearSession(name) {
    const { data } = await api.post('/ai/chat/clear', { name });
    return data;
  },

  async duplicateSession(source, target) {
    const { data } = await api.post('/ai/chat/duplicate', { source, target });
    return data;
  },

  async getSessionInfo(name) {
    const { data } = await api.get(`/ai/chat/info/${name}`);
    return data;
  },

  async searchMessages(query) {
    const { data } = await api.get(`/ai/chat/search/${encodeURIComponent(query)}`);
    return Array.isArray(data) ? data : [];
  },

  async archiveSession(name) {
    const { data } = await api.post('/ai/chat/archive', { id: name });
    return data;
  },

  async restoreSession(name) {
    const { data } = await api.post('/ai/chat/restore', { id: name });
    return data;
  },

  async exportSession(id, format = 'json') {
    const { data } = await api.post('/ai/chat/export', { id, format });
    return data;
  },
};
