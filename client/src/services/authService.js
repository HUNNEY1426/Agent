/**
 * Authentication Service
 *
 * NOTE: The backend does not currently provide auth endpoints.
 * This service uses localStorage-based mock auth so the frontend
 * architecture is ready for real authentication.
 *
 * Required backend endpoints (to be implemented):
 *   POST /auth/login    — { email, password } → { token, user }
 *   POST /auth/signup   — { name, email, password } → { token, user }
 *   POST /auth/logout   — invalidate token
 *   GET  /auth/me       — get current user from token
 */

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export const authService = {
  async login(email, password) {
    // Mock: accept any credentials for development
    const user = {
      id: 'user_1',
      name: email.split('@')[0],
      email,
      avatar: null,
    };
    const token = btoa(`${email}:${Date.now()}`);
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return { token, user };
  },

  async signup(name, email, password) {
    const user = {
      id: 'user_' + Date.now(),
      name,
      email,
      avatar: null,
    };
    const token = btoa(`${email}:${Date.now()}`);
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return { token, user };
  },

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
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
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
  },

  updateProfile(updates) {
    const user = this.getUser();
    if (!user) return null;
    const updated = { ...user, ...updates };
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
    return updated;
  },
};
