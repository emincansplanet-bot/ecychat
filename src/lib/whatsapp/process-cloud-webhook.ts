import { MessageDirection, MessageType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildWaMediaRef } from "@/lib/whatsapp/wa-media-ref";

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeWaId(raw: string): string {
  return raw.replace(/\D/g, "");
}

function captionFrom(msg: UnknownRecord): string | null {
  for (const key of ["image", "video", "document", "audio"]) {
    const o = msg[key];
    if (isRecord(o) && typeof o.caption === "string") return o.caption;
  }
  return null;
}

function extractMediaId(msg: UnknownRecord): string | null {
  for (const key of ["image", "audio", "video", "document", "sticker"] as const) {
    const o = msg[key];
    if (isRecord(o) && typeof o.id === "string" && o.id.trim()) return o.id.trim();
  }
  return null;
}

function defaultLabelForMedia(type: MessageType, msg: UnknownRecord): string {
  if (type === MessageType.DOCUMENT) {
    const d = msg.document;
    if (isRecord(d) && typeof d.filename === "string" && d.filename.trim()) {
      return `📎 ${d.filename.trim()}`;
    }
  }
  switch (type) {
    case MessageType.IMAGE:
      return "📷 Görsel";
    case MessageType.AUDIO:
      return "🎤 Ses";
    case MessageType.VIDEO:
      return "🎬 Video";
    case MessageType.DOCUMENT:
      return "📎 Dosya";
    default:
      return "📎 Ek";
  }
}

function extractMessageContent(msg: UnknownRecord): { type: MessageType; body: string | null } {
  const t = typeof msg.type === "string" ? msg.type : "unknown";
  switch (t) {
    case "text": {
      const text = msg.text;
      if (isRecord(text) && typeof text.body === "string") {
        return { type: MessageType.TEXT, body: text.body };
      }
      return { type: MessageType.TEXT, body: null };
    }
    case "image":
      return { type: MessageType.IMAGE, body: captionFrom(msg) };
    case "audio":
      return { type: MessageType.AUDIO, body: captionFrom(msg) };
    case "video":
      return { type: MessageType.VIDEO, body: captionFrom(msg) };
    case "document":
      return { type: MessageType.DOCUMENT, body: captionFrom(msg) };
    case "sticker":
      return { type: MessageType.IMAGE, body: captionFrom(msg) };
    default:
      return { type: MessageType.UNKNOWN, body: null };
  }
}

export async function processMetaWhatsAppWebhook(body: unknown): Promise<{
  processed: number;
  skippedChannels: number;
  organizationIds: string[];
}> {
  let processed = 0;
  let skippedChannels = 0;
  const orgsTouched = new Set<string>();

  if (!isRecord(body) || body.object !== "whatsapp_business_account") {
    return { processed: 0, skippedChannels: 0, organizationIds: [] };
  }

  const entries = body.entry;
  if (!Array.isArray(entries)) return { processed: 0, skippedChannels: 0, organizationIds: [] };

  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const changes = entry.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      if (!isRecord(change)) continue;
      if (change.field !== "messages") continue;
      const value = change.value;
      if (!isRecord(value)) continue;

      const metadata = value.metadata;
      if (!isRecord(metadata)) continue;
      const phoneNumberId = metadata.phone_number_id;
      if (typeof phoneNumberId !== "string") continue;

      const channel = await prisma.whatsAppChannel.findFirst({
        where: { metaPhoneNumberId: phoneNumberId },
      });

      if (!channel) {
        skippedChannels += 1;
        continue;
      }

      const orgId = channel.organizationId;

      const contactsArr = value.contacts;
      if (Array.isArray(contactsArr)) {
        for (const c of contactsArr) {
          if (!isRecord(c)) continue;
          const waIdRaw = typeof c.wa_id === "string" ? c.wa_id : null;
          if (!waIdRaw) continue;
          const waId = normalizeWaId(waIdRaw);
          const profile = c.profile;
          const name =
            isRecord(profile) && typeof profile.name === "string" ? profile.name : null;
          await prisma.contact.upsert({
            where: {
              organizationId_waId: { organizationId: orgId, waId },
            },
            create: {
              organizationId: orgId,
              waId,
              displayName: name,
            },
            update: name ? { displayName: name } : {},
          });
        }
      }

      const messages = value.messages;
      if (!Array.isArray(messages)) continue;

      for (const msg of messages) {
        if (!isRecord(msg)) continue;
        const fromRaw = typeof msg.from === "string" ? msg.from : null;
        const waMessageId = typeof msg.id === "string" ? msg.id : null;
        if (!fromRaw || !waMessageId) continue;

        const from = normalizeWaId(fromRaw);
        const dup = await prisma.message.findUnique({ where: { waMessageId } });
        if (dup) continue;

        const { type, body: rawBody } = extractMessageContent(msg);
        const mediaId = extractMediaId(msg);
        const textBody =
          rawBody ??
          (mediaId
            ? defaultLabelForMedia(type, msg)
            : type !== MessageType.TEXT && type !== MessageType.UNKNOWN
              ? `[${type}]`
              : null);
        const ts =
          typeof msg.timestamp === "string" ? Number.parseInt(msg.timestamp, 10) * 1000 : Date.now();
        const createdAt = Number.isFinite(ts) ? new Date(ts) : new Date();

        const inserted = await prisma.$transaction(async (tx) => {
          const again = await tx.message.findUnique({ where: { waMessageId } });
          if (again) return false;

          const contact = await tx.contact.upsert({
            where: {
              organizationId_waId: { organizationId: orgId, waId: from },
            },
            create: { organizationId: orgId, waId: from },
            update: {},
          });

          const conversation = await tx.conversation.upsert({
            where: {
              channelId_contactId: { channelId: channel.id, contactId: contact.id },
            },
            create: {
              organizationId: orgId,
              channelId: channel.id,
              contactId: contact.id,
              lastMessageAt: createdAt,
            },
            update: {
              lastMessageAt: createdAt,
              status: "OPEN",
            },
          });

          await tx.message.create({
            data: {
              conversationId: conversation.id,
              direction: MessageDirection.INBOUND,
              type,
              body: type === MessageType.TEXT ? rawBody : (textBody ?? rawBody),
              waMessageId,
              mediaUrl: mediaId ? buildWaMediaRef(mediaId) : undefined,
              createdAt,
            },
          });
          return true;
        });

        if (inserted) {
          processed += 1;
          orgsTouched.add(orgId);
        }
      }
    }
  }

  return { processed, skippedChannels, organizationIds: [...orgsTouched] };
}
