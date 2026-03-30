#!/usr/bin/env bash
# Kullanım (sunucuda, repo kökünden): ./scripts/gen-prod-dotenv.sh 1.2.3.4
# veya: ./scripts/gen-prod-dotenv.sh panel.example.com   (http://host:3000 üretir)
set -euo pipefail

HOST="${1:?Kullanım: $0 SUNUCU_IP_veya_HOST  (örn. 78.135.93.8)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.env"

if [[ -f "$OUT" && "${2:-}" != "--force" ]]; then
  echo "Var: $OUT — üzerine yazmak için: $0 $HOST --force" >&2
  exit 1
fi

POSTGRES_PASSWORD="$(openssl rand -base64 32 | tr -d '\n' | tr '+/' '-_' | tr -d '=')"
AUTH_SECRET="$(openssl rand -base64 32 | tr -d '\n')"
BASE="http://${HOST}:3000"

umask 077
cat > "$OUT" <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
AUTH_SECRET=$AUTH_SECRET
AUTH_URL=$BASE
NEXTAUTH_URL=$BASE
NEXT_PUBLIC_APP_URL=$BASE
DEMO_MOCK_SEND=false
EOF

echo "Yazıldı: $OUT"
echo "Sonraki: docker compose -f docker-compose.prod.yml up -d --build"
