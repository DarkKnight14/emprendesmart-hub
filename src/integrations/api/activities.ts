// src/integrations/api/activities.ts
// Mapeo: frontend usa "descripcion/tipo_actividad/monto/fecha/emprendimiento_id/impacto/duracion"
//        backend usa  "title/type/amount/activityDate/businessId"

import { api } from './client';

// Tipo que el frontend usa
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

// Tipo que devuelve el backend
interface BackendActivity {
  id: string;
  title: string;
  description?: string;
  type: string;
  amount: number;
  activityDate: string;
  impacto?: string;
  duracion?: number | null;
  businessId: string;
  createdAt: string;
}

// Backend → Frontend
function toAct(b: BackendActivity): Actividad {
  return {
    id:               b.id,
    fecha:            new Date(b.activityDate).toISOString().slice(0, 10),
    tipo_actividad:   b.type,
    descripcion:      b.title,
    monto:            b.amount,
    impacto:          b.impacto || 'medio',
    duracion:         b.duracion ?? null,
    emprendimiento_id: b.businessId,
  };
}

// Frontend → Backend
function toBackend(a: Partial<Actividad> & { businessId?: string }) {
  return {
    title:        a.descripcion,
    type:         a.tipo_actividad,
    amount:       a.monto,
    activityDate: a.fecha ? new Date(a.fecha).toISOString() : undefined,
    impacto:      a.impacto,
    duracion:     a.duracion,
    businessId:   a.emprendimiento_id || a.businessId,
  };
}

export const activitiesApi = {
  async list(businessId?: string): Promise<Actividad[]> {
    const path = businessId
      ? `/activities?businessId=${businessId}`
      : '/activities';
    const data = await api.get<BackendActivity[]>(path);
    return data.map(toAct);
  },

  async create(input: Omit<Actividad, 'id'>): Promise<Actividad> {
    const data = await api.post<BackendActivity>('/activities', toBackend(input));
    return toAct(data);
  },

  async update(id: string, input: Partial<Actividad>): Promise<Actividad> {
    const data = await api.put<BackendActivity>(`/activities/${id}`, toBackend(input));
    return toAct(data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/activities/${id}`);
  },
};
