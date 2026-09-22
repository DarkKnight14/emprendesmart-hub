// src/integrations/api/business.ts
// Datos de emprendimientos directamente desde Lovable Cloud (Supabase)

import { supabase } from "@/integrations/supabase/client";

export interface Emprendimiento {
  id: string;
  nombre: string;
  tipo: string;
  descripcion?: string;
  estado: string;
  fecha_inicio: string;
  createdAt?: string;
}

type Row = {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  fecha_inicio: string;
  created_at: string;
};

function toEmp(b: Row): Emprendimiento {
  return {
    id: b.id,
    nombre: b.nombre,
    tipo: b.tipo,
    estado: b.estado || "activo",
    fecha_inicio: (b.fecha_inicio ?? b.created_at).slice(0, 10),
    createdAt: b.created_at,
  };
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sesión expirada. Inicia sesión de nuevo.");
  return data.user.id;
}

export const businessApi = {
  async list(): Promise<Emprendimiento[]> {
    const { data, error } = await supabase
      .from("emprendimientos")
      .select("id, nombre, tipo, estado, fecha_inicio, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => toEmp(r as Row));
  },

  async create(input: Omit<Emprendimiento, "id" | "createdAt">): Promise<Emprendimiento> {
    const user_id = await requireUserId();
    const { data, error } = await supabase
      .from("emprendimientos")
      .insert({
        user_id,
        nombre: input.nombre,
        tipo: input.tipo || "General",
        estado: input.estado || "activo",
        fecha_inicio: input.fecha_inicio,
      })
      .select("id, nombre, tipo, estado, fecha_inicio, created_at")
      .single();
    if (error) throw new Error(error.message);
    return toEmp(data as Row);
  },

  async update(id: string, input: Partial<Emprendimiento>): Promise<Emprendimiento> {
    const { data, error } = await supabase
      .from("emprendimientos")
      .update({
        nombre: input.nombre,
        tipo: input.tipo,
        estado: input.estado,
        fecha_inicio: input.fecha_inicio,
      })
      .eq("id", id)
      .select("id, nombre, tipo, estado, fecha_inicio, created_at")
      .single();
    if (error) throw new Error(error.message);
    return toEmp(data as Row);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("emprendimientos").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
