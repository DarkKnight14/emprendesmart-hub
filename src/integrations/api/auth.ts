// src/integrations/api/auth.ts
// Autenticación vía Lovable Cloud (Supabase)
import { supabase } from "@/integrations/supabase/client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

function mapUser(u: {
  id: string;
  email?: string | null;
  created_at?: string;
  user_metadata?: { nombre?: string; name?: string };
}): AuthUser {
  return {
    id: u.id,
    name: u.user_metadata?.nombre ?? u.user_metadata?.name ?? (u.email?.split("@")[0] ?? ""),
    email: u.email ?? "",
    role: "user",
    createdAt: u.created_at ?? new Date().toISOString(),
  };
}

export const authApi = {
  async register(nombre: string, correo: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email: correo,
      password,
      options: {
        data: { nombre },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("No se pudo crear la cuenta.");
    return { user: mapUser(data.user), token: data.session?.access_token ?? "" };
  },

  async login(correo: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo,
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Credenciales inválidas.");
    return { user: mapUser(data.user), token: data.session?.access_token ?? "" };
  },

  async getUser(): Promise<AuthUser | null> {
    const { data } = await supabase.auth.getUser();
    return data.user ? mapUser(data.user) : null;
  },

  async logout() {
    await supabase.auth.signOut();
  },

  isAuthenticated(): boolean {
    // Chequeo síncrono contra el token persistido por supabase-js
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const exp = parsed?.expires_at;
        if (exp && exp * 1000 > Date.now()) return true;
      }
      return false;
    } catch {
      return false;
    }
  },
};
