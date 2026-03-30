# ECYChat — üretim (Next.js + Prisma migrate)
# Oluştur: docker build -t ecychat .
# Çalıştır: DATABASE_URL + AUTH_SECRET + … env ile; ör. docker compose -f docker-compose.prod.yml

FROM node:20-bookworm-slim AS builder
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall → prisma generate; şema bu aşamada gerekli
COPY prisma ./prisma
RUN npm ci
COPY . .
ARG DATABASE_URL="postgresql://ecychat:ecychat@127.0.0.1:5432/ecychat?schema=public"
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim AS runner
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# CLI paketini kopyalama: eksik bağımlılıklar (effect) runtime/migrate'i kırar. Migrate = sadece global CLI.
#
# ASLA builder'a `npm install -g prisma` koyma — runner stage bunu miras almaz.

# Migrate için tam Prisma CLI (yalnızca bu stage'de; USER nextjs öncesi)
RUN npm install -g prisma@6.19.0

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["sh", "-c", "prisma migrate deploy && node server.js"]
