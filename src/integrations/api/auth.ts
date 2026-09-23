// src/integrations/api/auth.ts
// Autenticación: nube (Lovable Cloud) o servidor local según VITE_DATA_MODE
import { supabase } from "@/integrations/supabase/client";
import { IS_LOCAL, localFetch, localToken } from "./local";

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

function traducirError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists"))
    return "Este correo ya tiene una cuenta. Usa \"Iniciar sesión\" o prueba con otro correo.";
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("password")) return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("email")) return "El correo no es válido.";
  return msg;
}

type LocalAuth = { token: string; user: AuthUser };

export const authApi = {
  async register(nombre: string, correo: string, password: string) {
    if (IS_LOCAL) {
      const r = await localFetch<LocalAuth>("/auth/register", "POST", { nombre, correo, password });
      localToken.set(r.token);
      return r;
    }
    const { data, error } = await supabase.auth.signUp({
      email: correo,
      password,
      options: {
        data: { nombre },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw new Error(traducirError(error.message));
    if (!data.user) throw new Error("No se pudo crear la cuenta.");
    return { user: mapUser(data.user), token: data.session?.access_token ?? "" };
  },

  async login(correo: string, password: string) {
    if (IS_LOCAL) {
      const r = await localFetch<LocalAuth>("/auth/login", "POST", { correo, password });
      localToken.set(r.token);
      return r;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo,
      password,
    });
    if (error) throw new Error(traducirError(error.message));
    if (!data.user) throw new Error("Credenciales inválidas.");
    return { user: mapUser(data.user), token: data.session?.access_token ?? "" };
  },

  async getUser(): Promise<AuthUser | null> {
    if (IS_LOCAL) {
      if (!localToken.get()) return null;
      try {
        return await localFetch<AuthUser>("/auth/me");
      } catch {
        localToken.clear();
        return null;
      }
    }
    const { data } = await supabase.auth.getUser();
    return data.user ? mapUser(data.user) : null;
  },

  async logout() {
    if (IS_LOCAL) {
      localToken.clear();
      return;
    }
    await supabase.auth.signOut();
  },

  isAuthenticated(): boolean {
    if (IS_LOCAL) return !!localToken.get();
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
