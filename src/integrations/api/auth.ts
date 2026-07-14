// src/integrations/api/auth.ts
import { api, setToken, setStoredUser, clearToken, getStoredUser, getToken } from './client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  async register(nombre: string, correo: string, password: string): Promise<AuthResponse> {
    const data = await api.post<AuthResponse>('/auth/register', {
      nombre,
      correo,
      password,
    });
    setToken(data.token);
    setStoredUser(data.user);
    return data;
  },

  async login(correo: string, password: string): Promise<AuthResponse> {
    const data = await api.post<AuthResponse>('/auth/login', { correo, password });
    setToken(data.token);
    setStoredUser(data.user);
    return data;
  },

  async getUser(): Promise<AuthUser | null> {
    const token = getToken();
    if (!token) return null;
    try {
      // Decode JWT payload (no validation, just read)
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Check expiry
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        clearToken();
        return null;
      }
      // Return stored user
      return getStoredUser() as AuthUser | null;
    } catch {
      clearToken();
      return null;
    }
  },

  logout() {
    clearToken();
  },

  isAuthenticated(): boolean {
    const token = getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },
};
