import type { ConversationListRow } from "@/lib/conversations";
import { normalizeContactTagsJson } from "@/lib/contact-tags";
import { contactDisplayLabel } from "@/lib/privacy";
import { MessageType } from "@prisma/client";

export type InboxItemJson = {
  id: string;
  href: string;
  title: string;
  preview: string;
  channelLabel: string;
  metaHint?: string | null;
  assignees?: string | null;
  tags: string[];
  unanswered: boolean;
};

export function mapConversationRowsToInboxItems(
  rows: ConversationListRow[],
  user: { role: "ADMIN" | "OPERATOR" },
): InboxItemJson[] {
  return rows.map((c) => {
    const last = c.messages[0];
    const typeHint = (t: MessageType | undefined) => {
      switch (t) {
        case MessageType.IMAGE:
          return "📷 Görsel";
        case MessageType.AUDIO:
          return "🎤 Ses";
        case MessageType.VIDEO:
          return "🎬 Video";
        case MessageType.DOCUMENT:
          return "📎 Dosya";
        case MessageType.UNKNOWN:
          return "Mesaj";
        default:
          return t ? `[${t}]` : "Mesaj yok";
      }
    };
    const preview =
      last?.body?.trim() ||
      (last?.type && last.type !== MessageType.TEXT ? typeHint(last.type) : "Mesaj yok");
    const assignees = c.assignments.map((a) => a.user.name ?? a.user.email).join(", ");
    const tags = normalizeContactTagsJson(c.contact.tags);
    const unanswered = !last || last.direction === "INBOUND";

    return {
      id: c.id,
      href: `/dashboard/inbox/${c.id}`,
      title: contactDisplayLabel(c.contact.displayName, c.contact.waId, user.role),
      preview,
      channelLabel: c.channel.internalLabel,
      metaHint: user.role === "ADMIN" ? c.channel.metaPhoneNumberId : null,
      assignees: user.role === "ADMIN" && assignees ? assignees : null,
      tags,
      unanswered,
    };
  });
}
