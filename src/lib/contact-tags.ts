import type { Prisma } from "@prisma/client";

export const PRESET_CONTACT_TAGS = ["VIP", "Yeni", "Pasif", "Bonus"] as const;

export function normalizeContactTagsJson(value: unknown): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) return [];
  const out = value.filter((x): x is string => typeof x === "string").map((t) => t.trim());
  return [...new Set(out)].filter(Boolean).slice(0, 15);
}

export function tagsToPrismaJson(tags: string[]): Prisma.InputJsonValue {
  return normalizeContactTagsJson(tags);
}
