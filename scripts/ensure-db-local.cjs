/**
 * DATABASE_URL yerel Postgres (localhost / 127.0.0.1) ise docker compose ile db'yi kaldırır
 * ve port açılana kadar bekler. Böylece `npm run dev` Prisma hatası vermez.
 *
 * Atlamak için: ECYCHAT_SKIP_DOCKER=1 npm run dev
 * (Kendi Postgres'iniz zaten ayaktaysa.)
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const net = require("net");

const root = path.join(__dirname, "..");

/** .env içinde ECYCHAT_SKIP_DOCKER=1 (npm run dev sürecine export edilmese bile). */
function skipDockerRequested() {
  if (process.env.ECYCHAT_SKIP_DOCKER === "1") return true;
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return false;
  const raw = fs.readFileSync(envPath, "utf8");
  const m = raw.match(/^\s*ECYCHAT_SKIP_DOCKER\s*=\s*(.+)$/m);
  if (!m) return false;
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v === "1";
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return "";
  const raw = fs.readFileSync(envPath, "utf8");
  const m = raw.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
  if (!m) return "";
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

function isLocalPostgres(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (!lower.startsWith("postgresql://") && !lower.startsWith("postgres://")) return false;
  try {
    const normalized = url.replace(/^postgresql:/, "http:").replace(/^postgres:/, "http:");
    const u = new URL(normalized);
    const h = (u.hostname || "").toLowerCase();
    return h === "localhost" || h === "127.0.0.1";
  } catch {
    return false;
  }
}

function parseHostPort(url) {
  const normalized = url.replace(/^postgresql:/, "http:").replace(/^postgres:/, "http:");
  const u = new URL(normalized);
  return {
    host: u.hostname || "127.0.0.1",
    port: u.port ? Number(u.port) : 5432,
  };
}

function waitPort(host, port, ms = 60000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const attempt = () => {
      const s = net.createConnection(port, host, () => {
        s.end();
        resolve();
      });
      s.on("error", () => {
        s.destroy();
        if (Date.now() - t0 > ms) {
          reject(new Error(`Postgres hazır değil: ${host}:${port} (${ms / 1000}s)`));
        } else {
          setTimeout(attempt, 350);
        }
      });
    };
    attempt();
  });
}

(async () => {
  if (skipDockerRequested()) {
    return;
  }

  const dbUrl = loadDatabaseUrl();
  if (!isLocalPostgres(dbUrl)) {
    return;
  }

  const { host, port } = parseHostPort(dbUrl);

  try {
    try {
      execSync("docker compose up -d --wait", { stdio: "inherit", cwd: root });
    } catch {
      execSync("docker compose up -d", { stdio: "inherit", cwd: root });
    }
  } catch {
    console.error(
      "\n[ecychat] Docker ile Postgres başlatılamadı. Docker Desktop çalışıyor mu?\n" +
        "   Elle: cd ecychat && docker compose up -d\n" +
        "   Yerel Postgres kullanıyorsanız: ECYCHAT_SKIP_DOCKER=1 npm run dev\n",
    );
    process.exit(1);
  }

  process.stdout.write(`[ecychat] Postgres bekleniyor (${host}:${port})… `);
  try {
    await waitPort(host, port);
  } catch (e) {
    console.error("\n" + (e.message || e));
    process.exit(1);
  }
  console.log("tamam.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
