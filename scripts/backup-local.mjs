// Migra tu usuario, emprendimientos y actividades (y el resto de tus datos) de la nube a tu PostgreSQL local.
// Uso: completa BACKUP_EMAIL y BACKUP_PASSWORD en .env y ejecuta: npm run backup:local
import pg from "pg";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, DATABASE_URL, BACKUP_EMAIL, BACKUP_PASSWORD, BACKUP_ACCOUNTS } = process.env;
if (!DATABASE_URL) throw new Error("Falta DATABASE_URL en .env");
// Varias cuentas: BACKUP_ACCOUNTS="correo1:clave1,correo2:clave2"
const ACCOUNTS = (BACKUP_ACCOUNTS || "").split(",").map((x) => x.trim()).filter(Boolean)
  .map((x) => { const i = x.indexOf(":"); return [x.slice(0, i).trim(), x.slice(i + 1)]; });
if (BACKUP_EMAIL && BACKUP_PASSWORD) ACCOUNTS.push([BACKUP_EMAIL, BACKUP_PASSWORD]);
if (!ACCOUNTS.length) throw new Error("Completa BACKUP_ACCOUNTS en .env");

const TABLES = {
  profiles: `id uuid primary key, nombre text, correo text, created_at timestamptz, updated_at timestamptz`,
  emprendimientos: `id uuid primary key default gen_random_uuid(), user_id uuid, nombre text, tipo text, fecha_inicio date, estado text, created_at timestamptz default now(), updated_at timestamptz default now()`,
  actividades: `id uuid primary key default gen_random_uuid(), emprendimiento_id uuid, user_id uuid, fecha date, tipo_actividad text, descripcion text, monto numeric, duracion integer, impacto text, created_at timestamptz default now(), updated_at timestamptz default now()`,
  comments: `id uuid primary key, actividad_id uuid, user_id uuid, contenido text, editado boolean, fecha_edicion timestamptz, created_at timestamptz`,
  indicadores: `id uuid primary key, emprendimiento_id uuid, user_id uuid, nombre text, valor numeric, fecha_calculo timestamptz, tendencia text`,
  alertas: `id uuid primary key, emprendimiento_id uuid, user_id uuid, tipo text, mensaje text, nivel text, fecha timestamptz, leida boolean`,
  metas: `id uuid primary key, user_id uuid, emprendimiento_id uuid, titulo text, descripcion text, tipo text, valor_objetivo numeric, valor_actual numeric, fecha_limite date, estado text, created_at timestamptz, updated_at timestamptz`,
  notas: `id uuid primary key, user_id uuid, emprendimiento_id uuid, contenido text, created_at timestamptz, updated_at timestamptz`,
};

const db = new pg.Client({ connectionString: DATABASE_URL.split("?")[0] });
await db.connect();

for (const [EMAIL, PASS] of ACCOUNTS) {
  const cloud = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data: login, error: loginErr } = await cloud.auth.signInWithPassword({ email: EMAIL, password: PASS });
  if (loginErr) { console.warn(`⚠ ${EMAIL}: ` + loginErr.message); continue; }


  // Usuario: mismo id que en la nube, con tu contraseña actual
  const u = login.user;
  await db.query(`CREATE TABLE IF NOT EXISTS public.usuarios (id uuid primary key default gen_random_uuid(), nombre text not null default '', correo text unique not null, password_hash text not null, created_at timestamptz not null default now())`);
  await db.query(
    `INSERT INTO public.usuarios (id, nombre, correo, password_hash, created_at) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (correo) DO UPDATE SET nombre=EXCLUDED.nombre, password_hash=EXCLUDED.password_hash`,
    [u.id, u.user_metadata?.nombre ?? EMAIL.split("@")[0], EMAIL.toLowerCase(), await bcrypt.hash(PASS, 10), u.created_at],
  );
  console.log(`✔ usuario: ${EMAIL}`);

  for (const [table, cols] of Object.entries(TABLES)) {
    await db.query(`CREATE TABLE IF NOT EXISTS public.${table} (${cols})`);
    const { data, error } = await cloud.from(table).select("*");
    if (error) { console.warn(`⚠ ${table}: ${error.message}`); continue; }
    for (const row of data) {
      const keys = Object.keys(row);
      const ph = keys.map((_, i) => `$${i + 1}`).join(",");
      const upd = keys.filter((k) => k !== "id").map((k) => `${k}=EXCLUDED.${k}`).join(",");
      await db.query(
        `INSERT INTO public.${table} (${keys.join(",")}) VALUES (${ph}) ON CONFLICT (id) DO UPDATE SET ${upd}`,
        keys.map((k) => row[k]),
      );
    }
    console.log(`✔ ${table}: ${data.length} filas copiadas`);
  }

  await cloud.auth.signOut();
}

await db.end();
console.log("Migración completa. Pon VITE_DATA_MODE=\"local\" en .env, ejecuta npm run server:local y npm run dev.");
