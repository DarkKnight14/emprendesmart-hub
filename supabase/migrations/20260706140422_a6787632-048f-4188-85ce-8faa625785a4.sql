
CREATE TYPE public.meta_tipo AS ENUM ('ingresos','gastos','actividades','personalizada');
CREATE TYPE public.meta_estado AS ENUM ('activa','completada','cancelada');

CREATE TABLE public.metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  emprendimiento_id uuid NOT NULL REFERENCES public.emprendimientos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  tipo public.meta_tipo NOT NULL DEFAULT 'personalizada',
  valor_objetivo numeric NOT NULL DEFAULT 0,
  valor_actual numeric NOT NULL DEFAULT 0,
  fecha_limite date,
  estado public.meta_estado NOT NULL DEFAULT 'activa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas TO authenticated;
GRANT ALL ON public.metas TO service_role;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own metas all" ON public.metas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER metas_updated BEFORE UPDATE ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  emprendimiento_id uuid NOT NULL REFERENCES public.emprendimientos(id) ON DELETE CASCADE,
  contenido text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas TO authenticated;
GRANT ALL ON public.notas TO service_role;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notas all" ON public.notas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER notas_updated BEFORE UPDATE ON public.notas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
