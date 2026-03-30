import type { ConversationStatus, UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { normalizeContactTagsJson } from "@/lib/contact-tags";
import { prisma } from "@/lib/prisma";

const conversationListArgs = Prisma.validator<Prisma.ConversationDefaultArgs>()({
  include: {
    contact: true,
    channel: {
      select: {
        id: true,
        internalLabel: true,
        metaPhoneNumberId: true,
      },
    },
    assignments: {
      where: { unassignedAt: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    },
    messages: {
      orderBy: { createdAt: "desc" },
      take: 1,
    },
  },
});

export type ConversationListRow = Prisma.ConversationGetPayload<
  typeof conversationListArgs
>;

function buildConversationListWhere(params: {
  organizationId: string;
  userId: string;
  role: UserRole;
  status: ConversationStatus;
  searchQuery?: string;
}): Prisma.ConversationWhereInput {
  const { organizationId, userId, role, status, searchQuery } = params;

  const base: Prisma.ConversationWhereInput =
    role === "ADMIN"
      ? { organizationId, status }
      : {
          organizationId,
          status,
          assignments: { some: { userId, unassignedAt: null } },
        };

  const q = searchQuery?.trim();
  if (!q) return base;

  const digits = q.replace(/\D/g, "");
  const ors: Prisma.ConversationWhereInput[] = [
    { contact: { displayName: { contains: q } } },
  ];
  if (digits.length >= 3) {
    ors.push({ contact: { waId: { contains: digits } } });
  }

  return { AND: [base, { OR: ors }] };
}

export async function listConversationsForUser(params: {
  organizationId: string;
  userId: string;
  role: UserRole;
  status?: ConversationStatus;
  searchQuery?: string;
  /** Tam eşleşme; müşteri kartı etiketlerinden biri */
  tag?: string;
}): Promise<ConversationListRow[]> {
  const { organizationId, userId, role } = params;
  const status = params.status ?? "OPEN";

  const where = buildConversationListWhere({
    organizationId,
    userId,
    role,
    status,
    searchQuery: params.searchQuery,
  });

  const rows = await prisma.conversation.findMany({
    where,
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    ...conversationListArgs,
  });

  const tag = params.tag?.trim();
  if (!tag) return rows;
  return rows.filter((r) => normalizeContactTagsJson(r.contact.tags).includes(tag));
}

export async function getConversationForUser(params: {
  organizationId: string;
  userId: string;
  role: UserRole;
  conversationId: string;
}) {
  const { organizationId, userId, role, conversationId } = params;

  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    include: {
      contact: true,
      channel: {
        select: { id: true, internalLabel: true, metaPhoneNumberId: true },
      },
      assignments: {
        where: { unassignedAt: null },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!conv) return null;
  if (role === "ADMIN") return conv;

  const isAssigned = conv.assignments.some((a) => a.userId === userId);
  if (!isAssigned) return null;
  return conv;
}

export async function listMessagesForConversation(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: {
      sentBy: { select: { id: true, name: true, email: true } },
    },
  });
}
