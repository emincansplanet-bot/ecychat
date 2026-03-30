import { MessageDirection } from "@prisma/client";
import { normalizeContactTagsJson } from "@/lib/contact-tags";
import { prisma } from "@/lib/prisma";

export type BroadcastAudience = "all_open" | "unanswered" | "tag";

/** Açık konuşmalar + hedef kitle filtresi + limit (mevcut yayın mantığı ile aynı). */
export async function resolveBroadcastRecipients(params: {
  organizationId: string;
  limit: number;
  audience: BroadcastAudience;
  tagFilter: string | null;
}) {
  const { organizationId, limit, audience, tagFilter } = params;

  let convs = await prisma.conversation.findMany({
    where: { organizationId, status: "OPEN" },
    take: limit * 3,
    orderBy: { updatedAt: "desc" },
    include: {
      contact: true,
      channel: {
        select: { metaPhoneNumberId: true, graphApiAccessToken: true },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { direction: true },
      },
    },
  });

  if (audience === "unanswered") {
    convs = convs.filter((c) => {
      const last = c.messages[0];
      return !last || last.direction === MessageDirection.INBOUND;
    });
  } else if (tagFilter) {
    convs = convs.filter((c) =>
      normalizeContactTagsJson(c.contact.tags).includes(tagFilter),
    );
  }

  return convs.slice(0, limit);
}
