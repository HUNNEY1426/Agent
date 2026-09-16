import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 120000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Extract clear message from standardized API error format
      const message =
        (typeof data?.error === 'object' ? data?.error?.message : data?.error) ||
        data?.reason ||
        data?.message ||
        `Request failed with status ${status}`;

      const customError = new Error(message);
      customError.status = status;
      customError.response = error.response;
      return Promise.reject(customError);
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Please try again.'));
    }

    return Promise.reject(new Error('Unable to connect to the server. Please ensure the backend is running.'));
  }
);

export default api;
