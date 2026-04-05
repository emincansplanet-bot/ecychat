import type { UserRole } from "@prisma/client";
import {
  MessageDirection,
  Prisma,
  UserRole as UserRoleEnum,
} from "@prisma/client";
import { isWithinOnDutyWindow } from "@/lib/on-duty-schedule";
import { prisma } from "@/lib/prisma";

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export type DaySeriesPoint = {
  date: string;
  inbound: number;
  outbound: number;
};

/** Yönetici paneli: operatör / nöbetçi günlük özet (gelen atama anına göre, giden gönderene göre). */
export type OperatorActivityToday = {
  userId: string;
  name: string;
  email: string;
  role: "OPERATOR" | "NOBETCI";
  /** Şu an kendisine atanmış açık konuşma sayısı */
  openAssigned: number;
  inboundToday: number;
  outboundToday: number;
  /** inboundToday + outboundToday — sıralama için */
  messagesToday: number;
};

/** Yönetici: BroadcastLog üzerinden yayın özeti */
export type BroadcastDashboardSummary = {
  last30Days: {
    runs: number;
    successTotal: number;
    failTotal: number;
  };
  lastRun: {
    createdAt: string;
    successCount: number;
    failCount: number;
    targetLimit: number;
    bodyPreview: string;
    authorLabel: string | null;
  } | null;
};

function emptyDashboardStats(shiftActive: boolean) {
  return {
    openConversations: 0,
    unansweredConversations: 0,
    unassignedOpen: 0,
    quickReplyCount: 0,
    inboundToday: 0,
    outboundToday: 0,
    inboundYesterday: 0,
    outboundYesterday: 0,
    last7Days: [] as DaySeriesPoint[],
    operatorActivityToday: [] as OperatorActivityToday[],
    broadcastSummary: null as BroadcastDashboardSummary | null,
    shiftActive,
  };
}

export async function getDashboardStats(params: {
  organizationId: string;
  userId: string;
  role: UserRole;
  onDutySchedule?: unknown;
  now?: Date;
}) {
  const { organizationId, userId, role } = params;
  const now = params.now ?? new Date();
  const todayStart = startOfLocalDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart);
  yesterdayEnd.setMilliseconds(-1);

  let dutySchedule: unknown | null = params.onDutySchedule ?? null;
  if (role === UserRoleEnum.NOBETCI && params.onDutySchedule === undefined) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { onDutySchedule: true },
    });
    dutySchedule = u?.onDutySchedule ?? null;
  }

  if (role === UserRoleEnum.NOBETCI) {
    if (!dutySchedule || !isWithinOnDutyWindow(dutySchedule, now)) {
      return emptyDashboardStats(false);
    }
  }

  const adminScope = role === UserRoleEnum.ADMIN || role === UserRoleEnum.NOBETCI;

  const convWhere = adminScope
    ? { organizationId, status: "OPEN" as const }
    : {
        organizationId,
        status: "OPEN" as const,
        assignments: { some: { userId, unassignedAt: null } },
      };

  const msgScope = adminScope
    ? { conversation: { organizationId } }
    : {
        conversation: {
          organizationId,
          assignments: { some: { userId, unassignedAt: null } },
        },
      };

  const [openConversations, quickReplyCount, convRows, inboundToday, outboundToday, unassignedOpen] =
    await Promise.all([
      prisma.conversation.count({ where: convWhere }),
      prisma.quickReply.count({
        where: { organizationId, active: true },
      }),
      prisma.conversation.findMany({
        where: convWhere,
        select: {
          id: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { direction: true },
          },
        },
      }),
      prisma.message.count({
        where: {
          ...msgScope,
          createdAt: { gte: todayStart },
          direction: "INBOUND",
        },
      }),
      prisma.message.count({
        where: {
          ...msgScope,
          createdAt: { gte: todayStart },
          direction: "OUTBOUND",
        },
      }),
      adminScope
        ? prisma.conversation.count({
            where: {
              organizationId,
              status: "OPEN",
              assignments: { none: { unassignedAt: null } },
            },
          })
        : Promise.resolve(0),
    ]);

  const unansweredConversations = convRows.filter(
    (r) => !r.messages[0] || r.messages[0].direction === MessageDirection.INBOUND,
  ).length;

  const [inboundYesterday, outboundYesterday, last7Days, operatorActivityToday, broadcastSummary] =
    await Promise.all([
      prisma.message.count({
        where: {
          ...msgScope,
          createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
          direction: "INBOUND",
        },
      }),
      prisma.message.count({
        where: {
          ...msgScope,
          createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
          direction: "OUTBOUND",
        },
      }),
      buildLast7DaySeries({ organizationId, userId, role, todayStart }),
      role === UserRoleEnum.ADMIN
        ? buildOperatorActivityToday({ organizationId, todayStart })
        : Promise.resolve([] as OperatorActivityToday[]),
      role === UserRoleEnum.ADMIN
        ? buildBroadcastDashboardSummary({ organizationId, todayStart })
        : Promise.resolve(null as BroadcastDashboardSummary | null),
    ]);

  return {
    openConversations,
    unansweredConversations,
    unassignedOpen,
    quickReplyCount,
    inboundToday,
    outboundToday,
    inboundYesterday,
    outboundYesterday,
    last7Days,
    operatorActivityToday,
    broadcastSummary,
    shiftActive: true,
  };
}

async function buildLast7DaySeries(params: {
  organizationId: string;
  userId: string;
  role: UserRole;
  todayStart: Date;
}): Promise<DaySeriesPoint[]> {
  const { organizationId, userId, role, todayStart } = params;
  const start = new Date(todayStart);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const adminScope = role === UserRoleEnum.ADMIN || role === UserRoleEnum.NOBETCI;

  const msgWhere = adminScope
    ? { conversation: { organizationId } }
    : {
        conversation: {
          organizationId,
          assignments: { some: { userId, unassignedAt: null } },
        },
      };

  const rows = await prisma.message.findMany({
    where: {
      ...msgWhere,
      createdAt: { gte: start },
    },
    select: { createdAt: true, direction: true },
  });

  const points: DaySeriesPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(todayStart);
    day.setDate(day.getDate() - i);
    const ds = startOfLocalDay(day);
    const de = endOfLocalDay(day);
    const iso = ds.toISOString().slice(0, 10);
    let inbound = 0;
    let outbound = 0;
    for (const r of rows) {
      const t = r.createdAt.getTime();
      if (t < ds.getTime() || t > de.getTime()) continue;
      if (r.direction === MessageDirection.INBOUND) inbound += 1;
      else outbound += 1;
    }
    points.push({ date: iso, inbound, outbound });
  }
  return points;
}

async function buildOperatorActivityToday(params: {
  organizationId: string;
  todayStart: Date;
}): Promise<OperatorActivityToday[]> {
  const { organizationId, todayStart } = params;

  const staff = await prisma.user.findMany({
    where: {
      organizationId,
      active: true,
      role: { in: [UserRoleEnum.OPERATOR, UserRoleEnum.NOBETCI] },
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  if (!staff.length) return [];

  const [inboundRows, openRows, outboundGrouped] = await Promise.all([
    prisma.$queryRaw<Array<{ userId: string; cnt: bigint }>>(
      Prisma.sql`
        SELECT a."userId", COUNT(DISTINCT m.id) AS cnt
        FROM "Message" m
        INNER JOIN "Conversation" c ON c.id = m."conversationId"
        INNER JOIN "ConversationAssignment" a ON a."conversationId" = c.id
        WHERE c."organizationId" = ${organizationId}
          AND m.direction = 'INBOUND'::"MessageDirection"
          AND m."createdAt" >= ${todayStart}
          AND a."assignedAt" <= m."createdAt"
          AND (a."unassignedAt" IS NULL OR a."unassignedAt" > m."createdAt")
        GROUP BY a."userId"
      `,
    ),
    prisma.$queryRaw<Array<{ userId: string; cnt: bigint }>>(
      Prisma.sql`
        SELECT ca."userId", COUNT(DISTINCT c.id) AS cnt
        FROM "Conversation" c
        INNER JOIN "ConversationAssignment" ca ON ca."conversationId" = c.id
        WHERE c."organizationId" = ${organizationId}
          AND c.status = 'OPEN'::"ConversationStatus"
          AND ca."unassignedAt" IS NULL
        GROUP BY ca."userId"
      `,
    ),
    prisma.message.groupBy({
      by: ["sentByUserId"],
      where: {
        direction: MessageDirection.OUTBOUND,
        createdAt: { gte: todayStart },
        sentByUserId: { not: null },
        conversation: { organizationId },
      },
      _count: { id: true },
    }),
  ]);

  const inboundMap = new Map(
    inboundRows.map((r) => [r.userId, Number(r.cnt)]),
  );
  const openMap = new Map(openRows.map((r) => [r.userId, Number(r.cnt)]));
  const outboundMap = new Map<string, number>();
  for (const g of outboundGrouped) {
    if (g.sentByUserId) outboundMap.set(g.sentByUserId, g._count.id);
  }

  const rows: OperatorActivityToday[] = staff.map((u) => {
    const inboundToday = inboundMap.get(u.id) ?? 0;
    const outboundToday = outboundMap.get(u.id) ?? 0;
    const openAssigned = openMap.get(u.id) ?? 0;
    const role: OperatorActivityToday["role"] =
      u.role === UserRoleEnum.NOBETCI ? "NOBETCI" : "OPERATOR";
    return {
      userId: u.id,
      name: u.name?.trim() || u.email,
      email: u.email,
      role,
      openAssigned,
      inboundToday,
      outboundToday,
      messagesToday: inboundToday + outboundToday,
    };
  });

  rows.sort((a, b) => {
    if (b.messagesToday !== a.messagesToday) return b.messagesToday - a.messagesToday;
    if (b.openAssigned !== a.openAssigned) return b.openAssigned - a.openAssigned;
    return a.name.localeCompare(b.name, "tr");
  });

  return rows;
}

async function buildBroadcastDashboardSummary(params: {
  organizationId: string;
  todayStart: Date;
}): Promise<BroadcastDashboardSummary> {
  const { organizationId, todayStart } = params;
  const since30 = new Date(todayStart);
  since30.setDate(since30.getDate() - 29);
  since30.setHours(0, 0, 0, 0);

  const [agg, last] = await Promise.all([
    prisma.broadcastLog.aggregate({
      where: { organizationId, createdAt: { gte: since30 } },
      _sum: { successCount: true, failCount: true },
      _count: { id: true },
    }),
    prisma.broadcastLog.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        successCount: true,
        failCount: true,
        targetLimit: true,
        body: true,
        createdBy: { select: { name: true, email: true } },
      },
    }),
  ]);

  const runs = agg._count.id;
  const successTotal = agg._sum.successCount ?? 0;
  const failTotal = agg._sum.failCount ?? 0;

  let lastRun: BroadcastDashboardSummary["lastRun"] = null;
  if (last) {
    const raw = (last.body ?? "").replace(/\s+/g, " ").trim();
    const author = last.createdBy;
    const authorLabel = author
      ? (author.name?.trim() || author.email || null)
      : null;
    lastRun = {
      createdAt: last.createdAt.toISOString(),
      successCount: last.successCount,
      failCount: last.failCount,
      targetLimit: last.targetLimit,
      bodyPreview: raw.length > 160 ? `${raw.slice(0, 160)}…` : raw,
      authorLabel,
    };
  }

  return {
    last30Days: { runs, successTotal, failTotal },
    lastRun,
  };
}

/** Yönetici yayın sayfası: son 30 gün BroadcastLog özeti (dashboard ile aynı hesap). */
export async function getOrgBroadcastSummary(
  organizationId: string,
): Promise<BroadcastDashboardSummary> {
  return buildBroadcastDashboardSummary({
    organizationId,
    todayStart: startOfLocalDay(new Date()),
  });
}
