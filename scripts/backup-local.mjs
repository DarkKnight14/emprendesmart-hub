// Copia los datos de la nube a tu PostgreSQL local.
// Uso: completa BACKUP_EMAIL y BACKUP_PASSWORD en .env y ejecuta: npm run backup:local
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, DATABASE_URL, BACKUP_EMAIL, BACKUP_PASSWORD } = process.env;
if (!DATABASE_URL) throw new Error("Falta DATABASE_URL en .env");
if (!BACKUP_EMAIL || !BACKUP_PASSWORD) throw new Error("Completa BACKUP_EMAIL y BACKUP_PASSWORD en .env");

const TABLES = {
  profiles: `id uuid primary key, nombre text, correo text, created_at timestamptz, updated_at timestamptz`,
  emprendimientos: `id uuid primary key, user_id uuid, nombre text, tipo text, fecha_inicio date, estado text, created_at timestamptz, updated_at timestamptz`,
  actividades: `id uuid primary key, emprendimiento_id uuid, user_id uuid, fecha date, tipo_actividad text, descripcion text, monto numeric, duracion integer, impacto text, created_at timestamptz, updated_at timestamptz`,
  comments: `id uuid primary key, actividad_id uuid, user_id uuid, contenido text, editado boolean, fecha_edicion timestamptz, created_at timestamptz`,
  indicadores: `id uuid primary key, emprendimiento_id uuid, user_id uuid, nombre text, valor numeric, fecha_calculo timestamptz, tendencia text`,
  alertas: `id uuid primary key, emprendimiento_id uuid, user_id uuid, tipo text, mensaje text, nivel text, fecha timestamptz, leida boolean`,
  metas: `id uuid primary key, user_id uuid, emprendimiento_id uuid, titulo text, descripcion text, tipo text, valor_objetivo numeric, valor_actual numeric, fecha_limite date, estado text, created_at timestamptz, updated_at timestamptz`,
  notas: `id uuid primary key, user_id uuid, emprendimiento_id uuid, contenido text, created_at timestamptz, updated_at timestamptz`,
};

const cloud = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { error: loginErr } = await cloud.auth.signInWithPassword({ email: BACKUP_EMAIL, password: BACKUP_PASSWORD });
if (loginErr) throw new Error("No se pudo iniciar sesión: " + loginErr.message);

const db = new pg.Client({ connectionString: DATABASE_URL.split("?")[0] });
await db.connect();

for (const [table, cols] of Object.entries(TABLES)) {
  await db.query(`CREATE TABLE IF NOT EXISTS public.${table} (${cols})`);
  const { data, error } = await cloud.from(table).select("*");
  if (error) { console.warn(`⚠ ${table}: ${error.message}`); continue; }
  for (const row of data) {
    const keys = Object.keys(row);
    const vals = keys.map((k) => row[k]);
    const ph = keys.map((_, i) => `$${i + 1}`).join(",");
    const upd = keys.filter((k) => k !== "id").map((k) => `${k}=EXCLUDED.${k}`).join(",");
    await db.query(
      `INSERT INTO public.${table} (${keys.join(",")}) VALUES (${ph}) ON CONFLICT (id) DO UPDATE SET ${upd}`,
      vals,
    );
  }
  console.log(`✔ ${table}: ${data.length} filas copiadas`);
}

await db.end();
console.log("Copia local completa.");
