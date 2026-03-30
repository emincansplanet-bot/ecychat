import { prisma } from "@/lib/prisma";

export async function listQuickReplies(organizationId: string) {
  return prisma.quickReply.findMany({
    where: { organizationId, active: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true, body: true },
  });
}

export async function listPromotions(organizationId: string) {
  return prisma.promotion.findMany({
    where: { organizationId, active: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true, body: true },
  });
}

export async function listOperators(organizationId: string) {
  return prisma.user.findMany({
    where: { organizationId, role: "OPERATOR", active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}
