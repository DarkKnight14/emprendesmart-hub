// Modo local: la app habla con tu servidor local (npm run server:local) en vez de la nube.
// Se activa con VITE_DATA_MODE="local" en el archivo .env
export const IS_LOCAL = import.meta.env.VITE_DATA_MODE === "local";
const API = import.meta.env.VITE_LOCAL_API_URL || "http://localhost:3001";
const TOKEN_KEY = "es_local_token";

export const localToken = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export async function localFetch<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const t = localToken.get();
  if (t) headers.Authorization = `Bearer ${t}`;
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error("No se pudo conectar al servidor local. Ejecuta: npm run server:local");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data as T;
}
