import api from './api';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export const authService = {
  async signup(name, email, password, confirmPassword) {
    const { data } = await api.post('/auth/signup', {
      name,
      email,
      password,
      confirmPassword,
    });

    console.log('[AUTH DEBUG] signupSuccess=true');
    if (data.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    }
    if (data.user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    }
    return data;
  },

  async login(email, password) {
    const { data } = await api.post('/auth/login', {
      email,
      password,
    });

    console.log('[AUTH DEBUG] loginSuccess=true');
    if (data.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    }
    if (data.user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    }
    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network error on logout
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
    return { success: true };
  },

  async getMe() {
    try {
      const { data } = await api.get('/auth/me');
      console.log('[AUTH DEBUG] authMeStatus=200', 'userFound=' + Boolean(data.user));
      if (data.user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
      return null;
    } catch (error) {
      const status = error.response?.status || error.status || 401;
      console.log(`[AUTH DEBUG] authMeStatus=${status}`, 'loginSuccess=false');
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
  },

  async getProfile() {
    const { data } = await api.get('/user/profile');
    if (data.user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    }
    return data.user;
  },

  async updateProfile(updates) {
    const { data } = await api.put('/user/profile', updates);
    if (data.user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    }
    return data.user;
  },

  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  getUser() {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem(AUTH_TOKEN_KEY) || !!localStorage.getItem(AUTH_USER_KEY);
  },
};
