import api from './api';

export const fileService = {
  async listPDFs() {
    const { data } = await api.get('/pdf/list');
    return data;
  },

  async getStatus() {
    const { data } = await api.get('/pdf/status');
    return data;
  },

  async getPDFInfo(identifier) {
    const { data } = await api.get(`/pdf/info/${encodeURIComponent(identifier)}`);
    return data;
  },

  async uploadPDF(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post('/pdf/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return data;
  },

  async addPDF(filePath) {
    const { data } = await api.post('/pdf/add', { path: filePath });
    return data;
  },

  async usePDF(name) {
    const { data } = await api.post('/pdf/use', { name });
    return data;
  },

  async searchPDF(query) {
    const { data } = await api.post('/pdf/search', { query });
    return data;
  },

  async removePDF(identifier) {
    const { data } = await api.delete(`/pdf/remove/${encodeURIComponent(identifier)}`);
    return data;
  },

  async clearPDFs() {
    const { data } = await api.post('/pdf/clear');
    return data;
  },

  async disablePDF() {
    const { data } = await api.post('/pdf/off');
    return data;
  },
};
