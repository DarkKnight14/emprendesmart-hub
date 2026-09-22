// src/integrations/api/activities.ts
// Actividades directamente desde Lovable Cloud (Supabase)

import { supabase } from "@/integrations/supabase/client";

export interface Actividad {
  id: string;
  fecha: string;
  tipo_actividad: string;
  descripcion: string;
  monto: number;
  impacto: string;
  duracion: number | null;
  emprendimiento_id: string;
}

type Row = {
  id: string;
  fecha: string;
  tipo_actividad: string;
  descripcion: string;
  monto: number | string;
  impacto: string | null;
  duracion: number | null;
  emprendimiento_id: string;
};

const COLS = "id, fecha, tipo_actividad, descripcion, monto, impacto, duracion, emprendimiento_id";

function toAct(b: Row): Actividad {
  return {
    id: b.id,
    fecha: String(b.fecha).slice(0, 10),
    tipo_actividad: b.tipo_actividad,
    descripcion: b.descripcion,
    monto: Number(b.monto) || 0,
    impacto: b.impacto || "medio",
    duracion: b.duracion ?? null,
    emprendimiento_id: b.emprendimiento_id,
  };
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sesión expirada. Inicia sesión de nuevo.");
  return data.user.id;
}

export const activitiesApi = {
  async list(businessId?: string): Promise<Actividad[]> {
    let q = supabase.from("actividades").select(COLS).order("fecha", { ascending: false });
    if (businessId) q = q.eq("emprendimiento_id", businessId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => toAct(r as Row));
  },

  async create(input: Omit<Actividad, "id">): Promise<Actividad> {
    const user_id = await requireUserId();
    const { data, error } = await supabase
      .from("actividades")
      .insert({
        user_id,
        emprendimiento_id: input.emprendimiento_id,
        fecha: input.fecha,
        tipo_actividad: input.tipo_actividad as never,
        descripcion: input.descripcion,
        monto: input.monto ?? 0,
        impacto: (input.impacto || "medio") as never,
        duracion: input.duracion,
      })
      .select(COLS)
      .single();
    if (error) throw new Error(error.message);
    return toAct(data as Row);
  },

  async update(id: string, input: Partial<Actividad>): Promise<Actividad> {
    const { data, error } = await supabase
      .from("actividades")
      .update({
        emprendimiento_id: input.emprendimiento_id,
        fecha: input.fecha,
        tipo_actividad: input.tipo_actividad as never,
        descripcion: input.descripcion,
        monto: input.monto,
        impacto: input.impacto as never,
        duracion: input.duracion,
      })
      .eq("id", id)
      .select(COLS)
      .single();
    if (error) throw new Error(error.message);
    return toAct(data as Row);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("actividades").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
