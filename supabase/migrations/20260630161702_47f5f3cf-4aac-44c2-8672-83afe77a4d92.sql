
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.tipo_actividad AS ENUM ('ingreso', 'gasto', 'tarea', 'cliente');
CREATE TYPE public.impacto_nivel AS ENUM ('bajo', 'medio', 'alto');
CREATE TYPE public.alerta_nivel AS ENUM ('informativa', 'advertencia', 'critica');
CREATE TYPE public.tendencia AS ENUM ('sube', 'baja', 'estable');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL DEFAULT '',
  correo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- new user trigger -> profile + default user role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, correo)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- emprendimientos
CREATE TABLE public.emprendimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'General',
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  estado TEXT NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emprendimientos TO authenticated;
GRANT ALL ON public.emprendimientos TO service_role;
ALTER TABLE public.emprendimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own emp all" ON public.emprendimientos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_emp_updated BEFORE UPDATE ON public.emprendimientos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_emp_user ON public.emprendimientos(user_id);

-- actividades
CREATE TABLE public.actividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendimiento_id UUID NOT NULL REFERENCES public.emprendimientos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_actividad public.tipo_actividad NOT NULL,
  descripcion TEXT NOT NULL,
  monto NUMERIC(14,2) NOT NULL DEFAULT 0,
  duracion INTEGER,
  impacto public.impacto_nivel DEFAULT 'medio',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actividades TO authenticated;
GRANT ALL ON public.actividades TO service_role;
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own act all" ON public.actividades FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_act_updated BEFORE UPDATE ON public.actividades
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_act_emp ON public.actividades(emprendimiento_id);
CREATE INDEX idx_act_user_fecha ON public.actividades(user_id, fecha DESC);

-- comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id UUID NOT NULL REFERENCES public.actividades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  editado BOOLEAN NOT NULL DEFAULT false,
  fecha_edicion TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own comments all" ON public.comments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- indicadores
CREATE TABLE public.indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendimiento_id UUID NOT NULL REFERENCES public.emprendimientos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  fecha_calculo TIMESTAMPTZ NOT NULL DEFAULT now(),
  tendencia public.tendencia NOT NULL DEFAULT 'estable'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicadores TO authenticated;
GRANT ALL ON public.indicadores TO service_role;
ALTER TABLE public.indicadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ind all" ON public.indicadores FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- alertas
CREATE TABLE public.alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendimiento_id UUID NOT NULL REFERENCES public.emprendimientos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  nivel public.alerta_nivel NOT NULL DEFAULT 'informativa',
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  leida BOOLEAN NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertas TO authenticated;
GRANT ALL ON public.alertas TO service_role;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alertas all" ON public.alertas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_alertas_user ON public.alertas(user_id, fecha DESC);
