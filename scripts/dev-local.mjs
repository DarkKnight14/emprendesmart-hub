// Arranca la app en modo local con UN solo comando: npm run local
// 1) Copia tus datos de la nube a tu PostgreSQL (solo esta parte necesita internet).
// 2) Levanta el servidor local (puerto 3001) y la app (puerto 8080).
import { spawn } from "node:child_process";

const run = (cmd, args, name) => {
  const p = spawn(cmd, args, { stdio: "inherit", shell: true, env: process.env });
  p.on("exit", (code) => { if (code) console.error(`[${name}] terminó con código ${code}`); });
  return p;
};

console.log("Copiando tus datos de la nube a PostgreSQL local...");
const backup = spawn("node", ["--env-file=.env", "scripts/backup-local.mjs"], { stdio: "inherit" });
backup.on("exit", (code) => {
  if (code !== 0) {
    console.error("No se pudo copiar desde la nube (¿sin internet?). Arranco igual con los datos que ya estén locales.");
  }
  console.log("Iniciando servidor local y la app... abre http://localhost:8080");
  run("node", ["--env-file=.env", "scripts/local-server.mjs"], "servidor");
  run("node", ["node_modules/vite/bin/vite.js", "dev", "--port", "8080", "--strictPort"], "app");
});
