// Servidor local de EmprendeSmart (sin internet). Uso: npm run server:local
import http from "node:http";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const { DATABASE_URL, JWT_SECRET = "empredesmart_super_secret_2026", LOCAL_API_PORT = "3001" } = process.env;
if (!DATABASE_URL) throw new Error("Falta DATABASE_URL en .env");
const pool = new pg.Pool({ connectionString: DATABASE_URL.split("?")[0] });

await pool.query(`
  CREATE TABLE IF NOT EXISTS public.usuarios (id uuid primary key default gen_random_uuid(), nombre text not null default '', correo text unique not null, password_hash text not null, created_at timestamptz not null default now());
  CREATE TABLE IF NOT EXISTS public.emprendimientos (id uuid primary key default gen_random_uuid(), user_id uuid, nombre text, tipo text, fecha_inicio date, estado text, created_at timestamptz default now(), updated_at timestamptz default now());
  CREATE TABLE IF NOT EXISTS public.actividades (id uuid primary key default gen_random_uuid(), emprendimiento_id uuid, user_id uuid, fecha date, tipo_actividad text, descripcion text, monto numeric, duracion integer, impacto text, created_at timestamptz default now(), updated_at timestamptz default now());
  ALTER TABLE public.emprendimientos ALTER COLUMN id SET DEFAULT gen_random_uuid(), ALTER COLUMN created_at SET DEFAULT now(), ALTER COLUMN updated_at SET DEFAULT now();
  ALTER TABLE public.actividades ALTER COLUMN id SET DEFAULT gen_random_uuid(), ALTER COLUMN created_at SET DEFAULT now(), ALTER COLUMN updated_at SET DEFAULT now();
`);

const EMP = "id, nombre, tipo, estado, fecha_inicio::text, created_at";
const ACT = "id, fecha::text, tipo_actividad, descripcion, monto::float AS monto, impacto, duracion, emprendimiento_id";
const userOut = (u) => ({ id: u.id, name: u.nombre, email: u.correo, role: "user", createdAt: u.created_at });
const sign = (u) => jwt.sign({ sub: u.id }, JWT_SECRET, { expiresIn: "7d" });

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  });
  res.end(JSON.stringify(data));
}
const readBody = (req) =>
  new Promise((ok) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => ok(b ? JSON.parse(b) : {})); });

async function handle(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, "http://x");
  const parts = url.pathname.split("/").filter(Boolean);
  const body = ["POST", "PUT"].includes(req.method) ? await readBody(req) : {};

  if (parts[0] === "auth" && req.method === "POST") {
    const correo = String(body.correo || "").trim().toLowerCase();
    if (parts[1] === "register") {
      const ex = await pool.query("SELECT 1 FROM usuarios WHERE correo=$1", [correo]);
      if (ex.rowCount) return send(res, 409, { message: 'Este correo ya tiene una cuenta. Usa "Iniciar sesión".' });
      if (String(body.password || "").length < 6) return send(res, 400, { message: "La contraseña debe tener al menos 6 caracteres." });
      const { rows } = await pool.query(
        "INSERT INTO usuarios (nombre, correo, password_hash) VALUES ($1,$2,$3) RETURNING *",
        [body.nombre || correo.split("@")[0], correo, await bcrypt.hash(body.password, 10)],
      );
      return send(res, 200, { token: sign(rows[0]), user: userOut(rows[0]) });
    }
    if (parts[1] === "login") {
      const { rows } = await pool.query("SELECT * FROM usuarios WHERE correo=$1", [correo]);
      if (!rows[0] || !(await bcrypt.compare(String(body.password || ""), rows[0].password_hash)))
        return send(res, 401, { message: "Correo o contraseña incorrectos." });
      return send(res, 200, { token: sign(rows[0]), user: userOut(rows[0]) });
    }
  }

  let uid;
  try { uid = jwt.verify((req.headers.authorization || "").slice(7), JWT_SECRET).sub; }
  catch { return send(res, 401, { message: "Sesión expirada. Inicia sesión de nuevo." }); }

  if (parts[0] === "auth" && parts[1] === "me") {
    const { rows } = await pool.query("SELECT * FROM usuarios WHERE id=$1", [uid]);
    return rows[0] ? send(res, 200, userOut(rows[0])) : send(res, 401, { message: "Usuario no encontrado" });
  }

  const id = parts[1];
  if (parts[0] === "emprendimientos") {
    if (req.method === "GET") return send(res, 200, (await pool.query(`SELECT ${EMP} FROM emprendimientos WHERE user_id=$1 ORDER BY created_at DESC`, [uid])).rows);
    if (req.method === "POST") return send(res, 200, (await pool.query(
      `INSERT INTO emprendimientos (user_id,nombre,tipo,estado,fecha_inicio) VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE)) RETURNING ${EMP}`,
      [uid, body.nombre, body.tipo || "General", body.estado || "activo", body.fecha_inicio || null])).rows[0]);
    if (req.method === "PUT") return send(res, 200, (await pool.query(
      `UPDATE emprendimientos SET nombre=COALESCE($3,nombre), tipo=COALESCE($4,tipo), estado=COALESCE($5,estado), fecha_inicio=COALESCE($6::date,fecha_inicio), updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING ${EMP}`,
      [id, uid, body.nombre ?? null, body.tipo ?? null, body.estado ?? null, body.fecha_inicio ?? null])).rows[0]);
    if (req.method === "DELETE") {
      await pool.query("DELETE FROM actividades WHERE emprendimiento_id=$1 AND user_id=$2", [id, uid]);
      await pool.query("DELETE FROM emprendimientos WHERE id=$1 AND user_id=$2", [id, uid]);
      return send(res, 200, { ok: true });
    }
  }

  if (parts[0] === "actividades") {
    if (req.method === "GET") {
      const eid = url.searchParams.get("emprendimiento_id");
      const q = eid
        ? pool.query(`SELECT ${ACT} FROM actividades WHERE user_id=$1 AND emprendimiento_id=$2 ORDER BY fecha DESC`, [uid, eid])
        : pool.query(`SELECT ${ACT} FROM actividades WHERE user_id=$1 ORDER BY fecha DESC`, [uid]);
      return send(res, 200, (await q).rows);
    }
    if (req.method === "POST") return send(res, 200, (await pool.query(
      `INSERT INTO actividades (user_id,emprendimiento_id,fecha,tipo_actividad,descripcion,monto,impacto,duracion) VALUES ($1,$2,COALESCE($3::date,CURRENT_DATE),$4,$5,$6,$7,$8) RETURNING ${ACT}`,
      [uid, body.emprendimiento_id, body.fecha || null, body.tipo_actividad, body.descripcion, body.monto ?? 0, body.impacto || "medio", body.duracion ?? null])).rows[0]);
    if (req.method === "PUT") return send(res, 200, (await pool.query(
      `UPDATE actividades SET emprendimiento_id=COALESCE($3,emprendimiento_id), fecha=COALESCE($4::date,fecha), tipo_actividad=COALESCE($5,tipo_actividad), descripcion=COALESCE($6,descripcion), monto=COALESCE($7,monto), impacto=COALESCE($8,impacto), duracion=$9, updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING ${ACT}`,
      [id, uid, body.emprendimiento_id ?? null, body.fecha ?? null, body.tipo_actividad ?? null, body.descripcion ?? null, body.monto ?? null, body.impacto ?? null, body.duracion ?? null])).rows[0]);
    if (req.method === "DELETE") {
      await pool.query("DELETE FROM actividades WHERE id=$1 AND user_id=$2", [id, uid]);
      return send(res, 200, { ok: true });
    }
  }
  send(res, 404, { message: "Ruta no encontrada" });
}

http.createServer((req, res) => handle(req, res).catch((e) => { console.error(e); send(res, 500, { message: e.message }); }))
  .listen(Number(LOCAL_API_PORT), () => console.log(`Servidor local listo en http://localhost:${LOCAL_API_PORT}`));
