/* Yerel demo: .env yoksa PostgreSQL (docker-compose) + AUTH_SECRET oluşturur. */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");

function ensureEnvLine(filePath, key, line) {
  if (!fs.existsSync(filePath)) return;
  const c = fs.readFileSync(filePath, "utf8");
  if (new RegExp(`^${key}=`, "m").test(c)) return;
  fs.appendFileSync(filePath, `\n${line}\n`);
}

if (!fs.existsSync(envPath)) {
  const content = [
    '# Otomatik oluşturuldu — önce: docker compose up -d',
    '# Üretimde güçlü şifre + ayrı Postgres host kullanın.',
    "PORT=3000",
    "AUTH_URL=http://localhost:3000",
    "NEXTAUTH_URL=http://localhost:3000",
    "NEXT_PUBLIC_APP_URL=http://localhost:3000",
    'DATABASE_URL="postgresql://ecychat:ecychat@127.0.0.1:5432/ecychat?schema=public"',
    'AUTH_SECRET="ecychat-demo-local-only-replace-for-production-min-32chars"',
    "WHATSAPP_VERIFY_TOKEN=demo-verify",
    "DEMO_MOCK_SEND=true",
    "",
  ].join("\n");
  fs.writeFileSync(envPath, content, "utf8");
  console.log("[ecychat] .env oluşturuldu (PostgreSQL URL). Önce: docker compose up -d");
} else {
  ensureEnvLine(envPath, "DEMO_MOCK_SEND", "DEMO_MOCK_SEND=true");
  ensureEnvLine(envPath, "PORT", "PORT=3000");
  ensureEnvLine(envPath, "AUTH_URL", "AUTH_URL=http://localhost:3000");
  ensureEnvLine(envPath, "NEXTAUTH_URL", "NEXTAUTH_URL=http://localhost:3000");
  ensureEnvLine(envPath, "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_APP_URL=http://localhost:3000");
  console.log("[ecychat] .env zaten var (PORT / AUTH URL / DEMO_MOCK_SEND kontrol edildi).");
}
