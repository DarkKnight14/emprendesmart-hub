# EmprendeSmart — Mejoras v2

Archivos actualizados para reemplazar en tu proyecto de Lovable.

---

## Qué cambió y por qué

### 1. `src/routes/_authenticated/actividades.tsx` ✅ REEMPLAZAR

**Mejoras:**
- ✅ **Botón Editar** en cada fila (lápiz) — abre el modal con los datos precargados
- ✅ Soporte completo para `tarea` y `cliente` (antes solo ingreso/gasto en el form)
- ✅ Campo `duración` añadido al formulario
- ✅ Filtros de tipo (botones rápidos arriba de la tabla)
- ✅ Paginación (20 registros por página)
- ✅ Invalidación correcta de queries en crear/editar/eliminar

---

### 2. `src/routes/_authenticated/emprendimientos.tsx` ✅ REEMPLAZAR

**Mejoras:**
- ✅ **Botón Editar** en cada card — abre el modal con los datos cargados
- ✅ Estado "cerrado" ahora muestra badge rojo (destructive)
- ✅ Modal unificado para crear y editar
- ✅ Invalidación correcta del query de emprendimientos al guardar

---

### 3. `src/routes/_authenticated/alertas.tsx` ✅ REEMPLAZAR

**Mejoras:**
- ✅ Lee las alertas **desde la tabla `alertas` de Supabase** (antes calculaba todo en el frontend y la tabla quedaba vacía)
- ✅ Botón **Marcar como leída** en cada alerta individual (✓)
- ✅ Botón **Marcar todas leídas**
- ✅ Botón **Actualizar** que genera/refresca las alertas del mes
- ✅ Las alertas leídas se muestran con opacidad reducida
- ✅ Contador de no leídas en el título
- ✅ Loading skeleton mientras carga

---

### 4. `supabase/migrations/20260702000000_mejoras_alertas_y_rls.sql` ✅ NUEVA MIGRACIÓN

**Qué hace:**
- Añade política `UPDATE` a la tabla `alertas` (necesaria para marcar como leída — sin esto Supabase rechaza el update)
- Crea la función SQL `generar_alertas()` — el **motor de reglas** que evalúa las 5 reglas de negocio y persiste alertas en la BD
- Crea un **trigger** `trg_alertas_on_actividad` que llama automáticamente al motor de reglas cada vez que se inserta o actualiza una actividad

---

## Cómo aplicar los cambios

### En Lovable (recomendado)

1. Abre tu proyecto en Lovable
2. En el editor de código, reemplaza los 3 archivos `.tsx` con el contenido de esta carpeta
3. Para la migración SQL, ve a tu proyecto de **Supabase** → SQL Editor → pega y ejecuta el contenido del archivo `.sql`

### Localmente (si tienes el proyecto clonado)

```bash
# 1. Reemplaza los archivos tsx
cp src/routes/_authenticated/actividades.tsx   tu-proyecto/src/routes/_authenticated/
cp src/routes/_authenticated/emprendimientos.tsx tu-proyecto/src/routes/_authenticated/
cp src/routes/_authenticated/alertas.tsx        tu-proyecto/src/routes/_authenticated/

# 2. Aplica la migración (requiere Supabase CLI)
supabase db push
# o ejecuta el .sql directamente en el SQL Editor de Supabase
```

---

## Flujo de alertas después de los cambios

```
Usuario registra actividad
        ↓
Supabase trigger se dispara
        ↓
Motor de reglas SQL evalúa 5 reglas:
  ① Gastos > Ingresos → CRÍTICA
  ② Gastos crecieron >30% → ADVERTENCIA
  ③ Ingresos crecieron → INFORMATIVA
  ④ Sin ingresos este mes → ADVERTENCIA
  ⑤ Pocas actividades → INFORMATIVA
        ↓
Alertas guardadas en tabla `alertas`
        ↓
Página Alertas las muestra con opción de marcar leídas
```

---

## Próximos pasos sugeridos

- [ ] Filtrar actividades por emprendimiento en el dashboard
- [ ] Exportar actividades a CSV
- [ ] Página de detalle por emprendimiento con sus propias métricas
- [ ] Notificaciones push / email para alertas críticas
