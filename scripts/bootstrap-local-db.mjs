#!/usr/bin/env node
/**
 * psql olmadan: süper kullanıcı ile `ecychat` rolü + `ecychat` veritabanını oluşturur (idempotent).
 * .env içinde BOOTSTRAP_DATABASE_URL tanımlayın — bakım DB’si genelde `postgres`:
 *   postgresql://postgres:SIFRE@127.0.0.1:5432/postgres
 * Şifrede ! → %21 (@ ve : varsa da URL-encode edin.)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");

function loadDotEnv() {
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

const bootstrapUrl =
  process.env.BOOTSTRAP_DATABASE_URL?.trim() ||
  process.env.SUPERUSER_DATABASE_URL?.trim();

if (!bootstrapUrl) {
  console.error(
    "[ecychat] .env içine ekleyin (bir kez, sonra silebilirsiniz):\n" +
      "  BOOTSTRAP_DATABASE_URL=postgresql://KULLANICI:SIFRE@127.0.0.1:5432/postgres\n" +
      "Süper kullanıcı genelde postgres veya Mac kullanıcı adınızdır.",
  );
  process.exit(1);
}

const appUser = "ecychat";
const appPassword = "ecychat";
const appDb = "ecychat";

const client = new pg.Client({
  connectionString: bootstrapUrl,
  connectionTimeoutMillis: 15000,
});

async function main() {
  await client.connect();

  const role = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [appUser]);
  if (role.rows.length === 0) {
    const esc = appPassword.replace(/\\/g, "\\\\").replace(/'/g, "''");
    await client.query(`CREATE ROLE ecychat LOGIN PASSWORD '${esc}'`);
    console.log(`[ecychat] Rol oluşturuldu: ${appUser}`);
  } else {
    console.log(`[ecychat] Rol zaten var: ${appUser}`);
  }

  const dbCheck = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [appDb],
  );
  if (dbCheck.rows.length === 0) {
    await client.query(`CREATE DATABASE ecychat OWNER ecychat`);
    console.log(`[ecychat] Veritabanı oluşturuldu: ${appDb}`);
  } else {
    console.log(`[ecychat] Veritabanı zaten var: ${appDb}`);
  }

  await client.end();
  console.log("[ecychat] Bootstrap tamam — DATABASE_URL ile prisma migrate deploy çalıştırın.");
}

main().catch((e) => {
  console.error("[ecychat] Bootstrap hatası:", e.message || e);
  console.error(
    "İpucu: Süper kullanıcı postgres değilse BOOTSTRAP_DATABASE_URL içinde kullanıcı adını değiştirin.",
  );
  process.exit(1);
});
