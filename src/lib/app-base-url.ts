import { headers } from "next/headers";

/**
 * Sunucu tarafı: env ile taban URL (webhook / mutlak link önerileri).
 */
export function getAppBaseUrlFromEnv(): string {
  const u =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : "");
  if (u) return u.replace(/\/$/, "");
  return "http://localhost:3000";
}

/**
 * İstek başlıklarından köken (production’da Meta webhook URL’si için daha doğru).
 */
export async function resolveAppBaseUrl(): Promise<string> {
  const h = await headers();
  const rawHost =
    h.get("x-forwarded-host")?.split(",")[0]?.trim() ?? h.get("host")?.trim();
  if (rawHost) {
    const rawProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim()?.toLowerCase();
    const proto =
      rawProto === "http" || rawProto === "https"
        ? rawProto
        : rawHost.startsWith("localhost") || rawHost.startsWith("127.")
          ? "http"
          : "https";
    return `${proto}://${rawHost}`;
  }
  return getAppBaseUrlFromEnv();
}
