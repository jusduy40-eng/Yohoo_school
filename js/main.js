// js/auth.js - Discord OAuth2 Authentication (Browser)

class AuthManager {
  constructor() {
    this.token = null;
    this.user = null;
    this.init();
  }

  init() {
    this.checkAuthFromHash();
    this.token = this.getToken();
  }

  checkAuthFromHash() {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      const expiresIn = params.get('expires_in');

      if (token) {
        const authData = {
          token,
          expiresIn,
          timestamp: Date.now()
        };
        localStorage.setItem('discord_auth', JSON.stringify(authData));
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }

  getToken() {
    const authData = localStorage.getItem('discord_auth');
    if (!authData) return null;

    try {
      const data = JSON.parse(authData);
      const expiresAt = data.timestamp + (data.expiresIn * 1000);
      if (Date.now() > expiresAt) {
        this.clearAuth();
        return null;
      }
      return data.token;
    } catch (error) {
      this.clearAuth();
      return null;
    }
  }

  async getUser() {
    if (this.user) return this.user;

    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch('https://discord.com/api/users/@me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch user');

      this.user = await response.json();
      return this.user;
    } catch (error) {
      console.error('Auth error:', error);
      this.clearAuth();
      return null;
    }
  }

  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: CONFIG.discord.clientId,
      redirect_uri: CONFIG.discord.redirectUri,
      response_type: 'token',
      scope: CONFIG.discord.scopes.join(' ')
    });
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  login() {
    window.location.href = this.getAuthUrl();
  }

  logout() {
    this.clearAuth();
    window.location.href = 'index.html';
  }

  clearAuth() {
    localStorage.removeItem('discord_auth');
    this.token = null;
    this.user = null;
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  async requireAuth() {
    if (!this.isAuthenticated()) return false;
    const user = await this.getUser();
    return !!user;
  }
}

const auth = new AuthManager();

function loginWithDiscord() {
  auth.login();
}

function handleLoginClick() {
  if (auth.isAuthenticated()) {
    window.location.href = 'register.html';
  } else {
    auth.login();
  }
}
