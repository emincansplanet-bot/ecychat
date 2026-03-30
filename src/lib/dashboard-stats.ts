import type { UserRole } from "@prisma/client";
import { MessageDirection } from "@prisma/client";
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

export type OperatorOutboundToday = {
  userId: string;
  name: string;
  email: string;
  outbound: number;
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

export async function getDashboardStats(params: {
  organizationId: string;
  userId: string;
  role: UserRole;
}) {
  const { organizationId, userId, role } = params;

  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart);
  yesterdayEnd.setMilliseconds(-1);

  const convWhere =
    role === "ADMIN"
      ? { organizationId, status: "OPEN" as const }
      : {
          organizationId,
          status: "OPEN" as const,
          assignments: { some: { userId, unassignedAt: null } },
        };

  const msgScope =
    role === "ADMIN"
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
      role === "ADMIN"
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

  const [inboundYesterday, outboundYesterday, last7Days, operatorOutboundToday, broadcastSummary] =
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
      role === "ADMIN"
        ? buildOperatorOutboundToday({ organizationId, todayStart })
        : Promise.resolve([] as OperatorOutboundToday[]),
      role === "ADMIN"
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
    operatorOutboundToday,
    broadcastSummary,
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

  const msgWhere =
    role === "ADMIN"
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

async function buildOperatorOutboundToday(params: {
  organizationId: string;
  todayStart: Date;
}): Promise<OperatorOutboundToday[]> {
  const { organizationId, todayStart } = params;

  const grouped = await prisma.message.groupBy({
    by: ["sentByUserId"],
    where: {
      direction: MessageDirection.OUTBOUND,
      createdAt: { gte: todayStart },
      sentByUserId: { not: null },
      conversation: { organizationId },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 8,
  });

  const ids = grouped.map((g) => g.sentByUserId).filter(Boolean) as string[];
  if (ids.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ids }, organizationId },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return grouped
    .map((g) => {
      const u = g.sentByUserId ? byId.get(g.sentByUserId) : undefined;
      return {
        userId: g.sentByUserId ?? "",
        name: u?.name ?? u?.email ?? g.sentByUserId ?? "",
        email: u?.email ?? "",
        outbound: g._count.id,
      };
    })
    .filter((x) => x.userId);
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
