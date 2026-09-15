import api from './api';

export const historyService = {
  async getStatus() {
    const { data } = await api.get('/history/status');
    return data;
  },

  async search(query, options = {}) {
    const params = new URLSearchParams({ q: query });
    if (options.topK) params.append('topK', options.topK);
    if (options.minScore) params.append('minScore', options.minScore);
    const { data } = await api.get(`/history/search?${params}`);
    return data;
  },

  async enable() {
    const { data } = await api.post('/history/on');
    return data;
  },

  async disable() {
    const { data } = await api.post('/history/off');
    return data;
  },

  async toggle(enabled) {
    const { data } = await api.post('/history/use', {
      mode: enabled ? 'on' : 'off',
    });
    return data;
  },

  async clear() {
    const { data } = await api.post('/history/clear');
    return data;
  },

  async reindex() {
    const { data } = await api.post('/history/reindex');
    return data;
  },
};
