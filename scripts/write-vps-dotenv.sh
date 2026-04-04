#!/usr/bin/env bash
# Sunucuda: cd /opt/ecychat && ./scripts/write-vps-dotenv.sh [alan-adi]
# Mevcut .env varsa POSTGRES_PASSWORD ve AUTH_SECRET korunur; URL ve seed güncellenir.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN_RAW="${1:-panel.ecychat.xyz}"
DOMAIN="${DOMAIN_RAW#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%/}"
ENV_FILE="${ROOT}/.env"
BASE="https://${DOMAIN}"

extract() {
  local key="$1"
  [[ -f "$ENV_FILE" ]] || return 1
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | sed "s/^${key}=//" | sed 's/^"\(.*\)"$/\1/'
}

POSTGRES_PASSWORD="$(extract POSTGRES_PASSWORD || true)"
AUTH_SECRET="$(extract AUTH_SECRET || true)"

if [[ -z "${POSTGRES_PASSWORD}" ]]; then
  POSTGRES_PASSWORD="$(openssl rand -base64 24 | tr -d '\n' | tr '+/' '-_' | tr -d '=')"
  echo "Yeni POSTGRES_PASSWORD üretildi (ilk kurulum)." >&2
fi
if [[ -z "${AUTH_SECRET}" ]]; then
  AUTH_SECRET="$(openssl rand -base64 32 | tr -d '\n')"
  echo "Yeni AUTH_SECRET üretildi." >&2
fi

umask 077
cat > "${ENV_FILE}" <<EOF
# scripts/write-vps-dotenv.sh — ${DOMAIN}

POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
AUTH_SECRET=${AUTH_SECRET}

AUTH_URL=${BASE}
NEXTAUTH_URL=${BASE}
NEXT_PUBLIC_APP_URL=${BASE}

DEMO_MOCK_SEND=false

SEED_ADMIN_EMAIL=admin-817e42ad@ecychat.local
SEED_OPERATOR_EMAIL=operator-db6a5e1a@ecychat.local
SEED_ADMIN_PASSWORD=YvTWS1e7mapo0CEbBLzk
SEED_META_PHONE_NUMBER_ID=

WHATSAPP_VERIFY_TOKEN=demo-verify
WHATSAPP_APP_SECRET=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_API_VERSION=v22.0
WHATSAPP_TEMPLATE_NAME=
WHATSAPP_TEMPLATE_LANGUAGE=tr

REDIS_URL=redis://redis:6379
EOF

echo "Yazıldı: ${ENV_FILE}"
echo "Sonra: ./scripts/seed-docker.sh && docker compose -f docker-compose.prod.yml up -d"
