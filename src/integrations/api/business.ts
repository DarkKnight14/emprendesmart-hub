// src/integrations/api/business.ts
// Mapeo: frontend usa "nombre/tipo/estado/fecha_inicio"
//        backend usa "name/category/estado/fechaInicio"

import { api } from './client';

// Tipo que el frontend usa
export interface Emprendimiento {
  id: string;
  nombre: string;
  tipo: string;
  descripcion?: string;
  estado: string;
  fecha_inicio: string;
  createdAt?: string;
}

// Tipo que devuelve el backend
interface BackendBusiness {
  id: string;
  name: string;
  category: string;
  description?: string;
  estado?: string;
  fechaInicio?: string;
  createdAt: string;
  updatedAt: string;
}

// Backend → Frontend
function toEmp(b: BackendBusiness): Emprendimiento {
  return {
    id:          b.id,
    nombre:      b.name,
    tipo:        b.category,
    descripcion: b.description,
    estado:      b.estado || 'activo',
    fecha_inicio: b.fechaInicio
      ? new Date(b.fechaInicio).toISOString().slice(0, 10)
      : new Date(b.createdAt).toISOString().slice(0, 10),
    createdAt:   b.createdAt,
  };
}

// Frontend → Backend
function toBackend(e: Partial<Emprendimiento>) {
  return {
    name:        e.nombre,
    category:    e.tipo,
    description: e.descripcion,
    estado:      e.estado,
    fechaInicio: e.fecha_inicio,
  };
}

export const businessApi = {
  async list(): Promise<Emprendimiento[]> {
    const data = await api.get<BackendBusiness[]>('/business');
    return data.map(toEmp);
  },

  async create(input: Omit<Emprendimiento, 'id' | 'createdAt'>): Promise<Emprendimiento> {
    const data = await api.post<BackendBusiness>('/business', toBackend(input));
    return toEmp(data);
  },

  async update(id: string, input: Partial<Emprendimiento>): Promise<Emprendimiento> {
    const data = await api.put<BackendBusiness>(`/business/${id}`, toBackend(input));
    return toEmp(data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/business/${id}`);
  },

  async dashboard(id: string) {
    return api.get(`/business/${id}/dashboard`);
  },
};
