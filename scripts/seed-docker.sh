#!/usr/bin/env bash
# VPS: sunucuda Node/tsx kurmadan, aynı Docker ağındaki Postgres'e seed yazar.
# Önkoşul: .env içinde POSTGRES_PASSWORD; stack ayakta (db healthy).
#   cd /opt/ecychat && ./scripts/seed-docker.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f docker-compose.prod.yml)

if [[ ! -f .env ]]; then
  echo ".env yok. Önce cp .env.example .env veya gen-prod-dotenv.sh kullan." >&2
  exit 1
fi

DB_CID="$("${COMPOSE[@]}" ps -q db)"
if [[ -z "$DB_CID" ]]; then
  echo "db konteyneri yok. Önce: ${COMPOSE[*]} up -d" >&2
  exit 1
fi

NET="$(docker inspect "$DB_CID" --format '{{range $k, $_ := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null | awk '{print $1}')"
if [[ -z "$NET" ]]; then
  echo "Ağ adı okunamadı." >&2
  exit 1
fi

# .env — KEY=VAL (yorum satırları hariç)
set -a
# shellcheck disable=SC1091
source <(grep -v '^\s*#' .env | grep -v '^\s*$' || true)
set +a

PASS="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD .env içinde tanımlı olmalı}"
URL="postgresql://ecychat:${PASS}@db:5432/ecychat?schema=public"
SEED_PW="${SEED_ADMIN_PASSWORD:-changeme123}"

echo "Seed çalışıyor (ağ: $NET) …"

docker run --rm \
  --network "$NET" \
  -v "$ROOT:/app" \
  -w /app \
  -e "DATABASE_URL=$URL" \
  -e "SEED_ADMIN_PASSWORD=$SEED_PW" \
  -e "SEED_META_PHONE_NUMBER_ID=${SEED_META_PHONE_NUMBER_ID:-}" \
  node:20-bookworm-slim \
  bash -lc 'set -euo pipefail
    apt-get update -qq
    apt-get install -y -qq openssl ca-certificates >/dev/null
    npm ci --silent
    npx prisma generate
    npx tsx prisma/seed.ts'

echo "Tamam. Giriş: admin@ecychat.local (veya operator@ecychat.local) / şifre: ${SEED_PW}"
