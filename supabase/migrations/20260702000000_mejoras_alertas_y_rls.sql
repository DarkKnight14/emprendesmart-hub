-- Migration: Mejoras EmprendeSmart
-- Fecha: 2026-07-02
-- Descripción: Añade política UPDATE para alertas y trigger de auto-generación

-- ─────────────────────────────────────────────
-- 1. Política UPDATE para alertas (marcar como leída)
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'alertas'
      AND policyname = 'own alertas update'
  ) THEN
    CREATE POLICY "own alertas update"
      ON public.alertas FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 2. Función del motor de reglas (ejecutable como RPC)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generar_alertas(p_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp_id UUID;
  v_ingresos NUMERIC;
  v_gastos NUMERIC;
  v_ingresos_last NUMERIC;
  v_gastos_last NUMERIC;
  v_count_act INTEGER;
  v_count_inserted INTEGER := 0;
  v_first_this DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_first_last DATE := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
  v_last_last  DATE := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
BEGIN
  -- Solo genera para el primer emprendimiento activo del usuario
  SELECT id INTO v_emp_id FROM emprendimientos
  WHERE user_id = p_user_id AND estado = 'activo'
  ORDER BY created_at LIMIT 1;

  IF v_emp_id IS NULL THEN RETURN 0; END IF;

  -- Métricas mes actual
  SELECT
    COALESCE(SUM(CASE WHEN tipo_actividad = 'ingreso' THEN monto ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo_actividad = 'gasto'   THEN monto ELSE 0 END), 0),
    COUNT(*)
  INTO v_ingresos, v_gastos, v_count_act
  FROM actividades
  WHERE user_id = p_user_id AND fecha >= v_first_this;

  -- Métricas mes anterior
  SELECT
    COALESCE(SUM(CASE WHEN tipo_actividad = 'ingreso' THEN monto ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo_actividad = 'gasto'   THEN monto ELSE 0 END), 0)
  INTO v_ingresos_last, v_gastos_last
  FROM actividades
  WHERE user_id = p_user_id AND fecha BETWEEN v_first_last AND v_last_last;

  -- Eliminar alertas auto-generadas de hoy
  DELETE FROM alertas
  WHERE user_id = p_user_id AND fecha >= CURRENT_DATE;

  -- Regla 1: Gastos > Ingresos
  IF v_gastos > v_ingresos AND v_ingresos > 0 THEN
    INSERT INTO alertas(user_id, emprendimiento_id, tipo, mensaje, nivel)
    VALUES(p_user_id, v_emp_id, 'gastos_superiores',
      'Tus gastos superan tus ingresos este mes. Revisa tus costos.', 'critica');
    v_count_inserted := v_count_inserted + 1;
  END IF;

  -- Regla 2: Gastos crecieron >30% vs mes anterior
  IF v_gastos_last > 0 AND v_gastos > v_gastos_last * 1.3 THEN
    INSERT INTO alertas(user_id, emprendimiento_id, tipo, mensaje, nivel)
    VALUES(p_user_id, v_emp_id, 'aumento_gastos',
      format('Tus gastos aumentaron un %s%% vs el mes anterior.',
             ROUND(((v_gastos - v_gastos_last) / v_gastos_last) * 100)),
      'advertencia');
    v_count_inserted := v_count_inserted + 1;
  END IF;

  -- Regla 3: Ingresos crecieron
  IF v_ingresos_last > 0 AND v_ingresos > v_ingresos_last THEN
    INSERT INTO alertas(user_id, emprendimiento_id, tipo, mensaje, nivel)
    VALUES(p_user_id, v_emp_id, 'ingresos_crecimiento',
      format('¡Buen trabajo! Tus ingresos crecieron un %s%% vs el mes anterior.',
             ROUND(((v_ingresos - v_ingresos_last) / v_ingresos_last) * 100)),
      'informativa');
    v_count_inserted := v_count_inserted + 1;
  END IF;

  -- Regla 4: Sin ingresos este mes
  IF v_ingresos = 0 THEN
    INSERT INTO alertas(user_id, emprendimiento_id, tipo, mensaje, nivel)
    VALUES(p_user_id, v_emp_id, 'sin_ingresos',
      'Aún no registras ingresos este mes. ¡Empieza registrando tu primera venta!',
      'advertencia');
    v_count_inserted := v_count_inserted + 1;
  END IF;

  -- Regla 5: Pocas actividades registradas
  IF v_count_act < 5 THEN
    INSERT INTO alertas(user_id, emprendimiento_id, tipo, mensaje, nivel)
    VALUES(p_user_id, v_emp_id, 'pocas_actividades',
      'Registra al menos 5 actividades para obtener mejores indicadores y recomendaciones.',
      'informativa');
    v_count_inserted := v_count_inserted + 1;
  END IF;

  RETURN v_count_inserted;
END;
$$;

-- Permitir que usuarios autenticados llamen esta función
GRANT EXECUTE ON FUNCTION public.generar_alertas(UUID) TO authenticated;

-- ─────────────────────────────────────────────
-- 3. Trigger: genera alertas automáticamente al insertar/actualizar actividades
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_generar_alertas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.generar_alertas(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alertas_on_actividad ON public.actividades;
CREATE TRIGGER trg_alertas_on_actividad
  AFTER INSERT OR UPDATE ON public.actividades
  FOR EACH ROW EXECUTE FUNCTION public.trigger_generar_alertas();
