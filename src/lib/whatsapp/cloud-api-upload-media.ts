import { MessageType } from "@prisma/client";

export type GraphOutboundMediaKind = "image" | "video" | "audio" | "document";

type GraphSendResponse = {
  messages?: Array<{ id?: string }>;
  error?: { message?: string };
};

type GraphUploadResponse = {
  id?: string;
  error?: { message?: string };
};

export function inferGraphMediaKind(mime: string): GraphOutboundMediaKind {
  const m = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  return "document";
}

export function graphKindToMessageType(kind: GraphOutboundMediaKind): MessageType {
  switch (kind) {
    case "image":
      return MessageType.IMAGE;
    case "video":
      return MessageType.VIDEO;
    case "audio":
      return MessageType.AUDIO;
    case "document":
      return MessageType.DOCUMENT;
    default:
      return MessageType.UNKNOWN;
  }
}

export async function uploadMediaToWhatsApp(params: {
  phoneNumberId: string;
  accessToken: string;
  buffer: ArrayBuffer;
  mimeType: string;
  filename: string;
  kind: GraphOutboundMediaKind;
  apiVersion?: string;
}): Promise<{ mediaId: string }> {
  const v =
    params.apiVersion?.trim() ||
    process.env.WHATSAPP_API_VERSION?.trim() ||
    "v22.0";
  const url = `https://graph.facebook.com/${v}/${params.phoneNumberId}/media`;

  const blob = new Blob([params.buffer], { type: params.mimeType || "application/octet-stream" });
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", params.kind);
  form.append("file", blob, params.filename || "file");

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${params.accessToken}` },
    body: form,
  });

  const data = (await res.json().catch(() => ({}))) as GraphUploadResponse;
  if (!res.ok) {
    const msg =
      typeof data.error?.message === "string"
        ? data.error.message
        : `Meta medya yükleme HTTP ${res.status}`;
    throw new Error(msg);
  }

  const id = data.id;
  if (typeof id !== "string") {
    throw new Error("Meta medya yanıtında id yok");
  }
  return { mediaId: id };
}

export async function sendWhatsAppUploadedMedia(params: {
  phoneNumberId: string;
  accessToken: string;
  toWaId: string;
  mediaId: string;
  kind: GraphOutboundMediaKind;
  filename: string;
  caption?: string;
  apiVersion?: string;
}): Promise<{ waMessageId: string }> {
  const v =
    params.apiVersion?.trim() ||
    process.env.WHATSAPP_API_VERSION?.trim() ||
    "v22.0";
  const url = `https://graph.facebook.com/${v}/${params.phoneNumberId}/messages`;

  const cap = params.caption?.trim();

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to: params.toWaId,
    type: params.kind,
  };

  if (params.kind === "image") {
    body.image = {
      id: params.mediaId,
      ...(cap ? { caption: cap } : {}),
    };
  } else if (params.kind === "video") {
    body.video = {
      id: params.mediaId,
      ...(cap ? { caption: cap } : {}),
    };
  } else if (params.kind === "audio") {
    body.audio = { id: params.mediaId };
  } else {
    body.document = {
      id: params.mediaId,
      filename: params.filename || "document",
      ...(cap ? { caption: cap } : {}),
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as GraphSendResponse;
  if (!res.ok) {
    const msg =
      typeof data.error?.message === "string"
        ? data.error.message
        : `Meta mesaj HTTP ${res.status}`;
    throw new Error(msg);
  }

  const id = data.messages?.[0]?.id;
  if (typeof id !== "string") {
    throw new Error("Meta yanıtında mesaj kimliği yok");
  }
  return { waMessageId: id };
}
