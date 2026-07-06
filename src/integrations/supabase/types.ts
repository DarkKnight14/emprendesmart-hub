export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actividades: {
        Row: {
          created_at: string
          descripcion: string
          duracion: number | null
          emprendimiento_id: string
          fecha: string
          id: string
          impacto: Database["public"]["Enums"]["impacto_nivel"] | null
          monto: number
          tipo_actividad: Database["public"]["Enums"]["tipo_actividad"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descripcion: string
          duracion?: number | null
          emprendimiento_id: string
          fecha?: string
          id?: string
          impacto?: Database["public"]["Enums"]["impacto_nivel"] | null
          monto?: number
          tipo_actividad: Database["public"]["Enums"]["tipo_actividad"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string
          duracion?: number | null
          emprendimiento_id?: string
          fecha?: string
          id?: string
          impacto?: Database["public"]["Enums"]["impacto_nivel"] | null
          monto?: number
          tipo_actividad?: Database["public"]["Enums"]["tipo_actividad"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "actividades_emprendimiento_id_fkey"
            columns: ["emprendimiento_id"]
            isOneToOne: false
            referencedRelation: "emprendimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas: {
        Row: {
          emprendimiento_id: string
          fecha: string
          id: string
          leida: boolean
          mensaje: string
          nivel: Database["public"]["Enums"]["alerta_nivel"]
          tipo: string
          user_id: string
        }
        Insert: {
          emprendimiento_id: string
          fecha?: string
          id?: string
          leida?: boolean
          mensaje: string
          nivel?: Database["public"]["Enums"]["alerta_nivel"]
          tipo: string
          user_id: string
        }
        Update: {
          emprendimiento_id?: string
          fecha?: string
          id?: string
          leida?: boolean
          mensaje?: string
          nivel?: Database["public"]["Enums"]["alerta_nivel"]
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_emprendimiento_id_fkey"
            columns: ["emprendimiento_id"]
            isOneToOne: false
            referencedRelation: "emprendimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          actividad_id: string
          contenido: string
          created_at: string
          editado: boolean
          fecha_edicion: string | null
          id: string
          user_id: string
        }
        Insert: {
          actividad_id: string
          contenido: string
          created_at?: string
          editado?: boolean
          fecha_edicion?: string | null
          id?: string
          user_id: string
        }
        Update: {
          actividad_id?: string
          contenido?: string
          created_at?: string
          editado?: boolean
          fecha_edicion?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
        ]
      }
      emprendimientos: {
        Row: {
          created_at: string
          estado: string
          fecha_inicio: string
          id: string
          nombre: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estado?: string
          fecha_inicio?: string
          id?: string
          nombre: string
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estado?: string
          fecha_inicio?: string
          id?: string
          nombre?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      indicadores: {
        Row: {
          emprendimiento_id: string
          fecha_calculo: string
          id: string
          nombre: string
          tendencia: Database["public"]["Enums"]["tendencia"]
          user_id: string
          valor: number
        }
        Insert: {
          emprendimiento_id: string
          fecha_calculo?: string
          id?: string
          nombre: string
          tendencia?: Database["public"]["Enums"]["tendencia"]
          user_id: string
          valor?: number
        }
        Update: {
          emprendimiento_id?: string
          fecha_calculo?: string
          id?: string
          nombre?: string
          tendencia?: Database["public"]["Enums"]["tendencia"]
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicadores_emprendimiento_id_fkey"
            columns: ["emprendimiento_id"]
            isOneToOne: false
            referencedRelation: "emprendimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          created_at: string
          descripcion: string | null
          emprendimiento_id: string
          estado: Database["public"]["Enums"]["meta_estado"]
          fecha_limite: string | null
          id: string
          tipo: Database["public"]["Enums"]["meta_tipo"]
          titulo: string
          updated_at: string
          user_id: string
          valor_actual: number
          valor_objetivo: number
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          emprendimiento_id: string
          estado?: Database["public"]["Enums"]["meta_estado"]
          fecha_limite?: string | null
          id?: string
          tipo?: Database["public"]["Enums"]["meta_tipo"]
          titulo: string
          updated_at?: string
          user_id: string
          valor_actual?: number
          valor_objetivo?: number
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          emprendimiento_id?: string
          estado?: Database["public"]["Enums"]["meta_estado"]
          fecha_limite?: string | null
          id?: string
          tipo?: Database["public"]["Enums"]["meta_tipo"]
          titulo?: string
          updated_at?: string
          user_id?: string
          valor_actual?: number
          valor_objetivo?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_emprendimiento_id_fkey"
            columns: ["emprendimiento_id"]
            isOneToOne: false
            referencedRelation: "emprendimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      notas: {
        Row: {
          contenido: string
          created_at: string
          emprendimiento_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contenido: string
          created_at?: string
          emprendimiento_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contenido?: string
          created_at?: string
          emprendimiento_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_emprendimiento_id_fkey"
            columns: ["emprendimiento_id"]
            isOneToOne: false
            referencedRelation: "emprendimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          correo: string
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          correo?: string
          created_at?: string
          id: string
          nombre?: string
          updated_at?: string
        }
        Update: {
          correo?: string
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alerta_nivel: "informativa" | "advertencia" | "critica"
      app_role: "admin" | "user"
      impacto_nivel: "bajo" | "medio" | "alto"
      meta_estado: "activa" | "completada" | "cancelada"
      meta_tipo: "ingresos" | "gastos" | "actividades" | "personalizada"
      tendencia: "sube" | "baja" | "estable"
      tipo_actividad: "ingreso" | "gasto" | "tarea" | "cliente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alerta_nivel: ["informativa", "advertencia", "critica"],
      app_role: ["admin", "user"],
      impacto_nivel: ["bajo", "medio", "alto"],
      meta_estado: ["activa", "completada", "cancelada"],
      meta_tipo: ["ingresos", "gastos", "actividades", "personalizada"],
      tendencia: ["sube", "baja", "estable"],
      tipo_actividad: ["ingreso", "gasto", "tarea", "cliente"],
    },
  },
} as const
