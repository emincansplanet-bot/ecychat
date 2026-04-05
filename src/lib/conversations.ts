import type { ConversationStatus, UserRole } from "@prisma/client";
import { Prisma, UserRole as UserRoleEnum } from "@prisma/client";
import { normalizeContactTagsJson } from "@/lib/contact-tags";
import { isConversationUnanswered } from "@/lib/conversation-unanswered";
import { isWithinOnDutyWindow } from "@/lib/on-duty-schedule";
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
    role === "ADMIN" || role === UserRoleEnum.NOBETCI
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

async function resolveNoBetcSchedule(
  userId: string,
  role: UserRole,
  provided?: unknown,
): Promise<unknown | null> {
  if (role !== UserRoleEnum.NOBETCI) return null;
  if (provided !== undefined) return provided ?? null;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { onDutySchedule: true },
  });
  return u?.onDutySchedule ?? null;
}

export async function listConversationsForUser(params: {
  organizationId: string;
  userId: string;
  role: UserRole;
  status?: ConversationStatus;
  searchQuery?: string;
  /** Tam eşleşme; müşteri kartı etiketlerinden biri */
  tag?: string;
  /** Nöbetçi için önceden yüklenmiş takvim (yoksa DB’den okunur). */
  onDutySchedule?: unknown;
  now?: Date;
}): Promise<ConversationListRow[]> {
  const { organizationId, userId, role } = params;
  const status = params.status ?? "OPEN";
  const now = params.now ?? new Date();

  if (role === UserRoleEnum.NOBETCI) {
    const schedule = await resolveNoBetcSchedule(userId, role, params.onDutySchedule);
    if (!isWithinOnDutyWindow(schedule, now)) return [];
  }

  const where = buildConversationListWhere({
    organizationId,
    userId,
    role,
    status,
    searchQuery: params.searchQuery,
  });

  let rows = await prisma.conversation.findMany({
    where,
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    ...conversationListArgs,
  });

  if (role === UserRoleEnum.NOBETCI) {
    rows = rows.filter(isConversationUnanswered);
  }

  const tag = params.tag?.trim();
  if (!tag) return rows;
  return rows.filter((r) => normalizeContactTagsJson(r.contact.tags).includes(tag));
}

export async function getConversationForUser(params: {
  organizationId: string;
  userId: string;
  role: UserRole;
  conversationId: string;
  onDutySchedule?: unknown;
  now?: Date;
}) {
  const { organizationId, userId, role, conversationId } = params;
  const now = params.now ?? new Date();

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
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { direction: true },
      },
    },
  });

  if (!conv) return null;
  if (role === UserRoleEnum.ADMIN) return conv;

  if (role === UserRoleEnum.NOBETCI) {
    const schedule = await resolveNoBetcSchedule(userId, role, params.onDutySchedule);
    if (!isWithinOnDutyWindow(schedule, now)) return null;
    if (conv.status !== "OPEN") return null;
    if (!isConversationUnanswered(conv)) return null;
    return conv;
  }

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
