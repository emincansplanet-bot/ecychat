import { MessageDirection } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ConversationMessageInsight = {
  total: number;
  inbound: number;
  outbound: number;
  firstAt: Date | null;
  lastAt: Date | null;
};

export async function getConversationMessageInsight(
  conversationId: string,
): Promise<ConversationMessageInsight> {
  const [rows, first, last] = await Promise.all([
    prisma.message.groupBy({
      by: ["direction"],
      where: { conversationId },
      _count: { id: true },
    }),
    prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  let inbound = 0;
  let outbound = 0;
  for (const r of rows) {
    if (r.direction === MessageDirection.INBOUND) inbound = r._count.id;
    if (r.direction === MessageDirection.OUTBOUND) outbound = r._count.id;
  }

  return {
    total: inbound + outbound,
    inbound,
    outbound,
    firstAt: first?.createdAt ?? null,
    lastAt: last?.createdAt ?? null,
  };
}
