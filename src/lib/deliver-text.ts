import { randomUUID } from "node:crypto";
import type { MessageType } from "@prisma/client";
import { sendWhatsAppText } from "@/lib/whatsapp/cloud-api";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/cloud-api-template";
import {
  graphKindToMessageType,
  inferGraphMediaKind,
  sendWhatsAppUploadedMedia,
  uploadMediaToWhatsApp,
} from "@/lib/whatsapp/cloud-api-upload-media";

export function isDemoMockSendEnabled(): boolean {
  const v = process.env.DEMO_MOCK_SEND?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export async function deliverOutboundText(opts: {
  phoneNumberId: string | null | undefined;
  toWaId: string;
  text: string;
  channelToken: string | null | undefined;
  envToken: string | undefined;
}): Promise<{ waMessageId: string; mode: "mock" | "meta" }> {
  if (isDemoMockSendEnabled()) {
    return {
      waMessageId: `mock_${Date.now()}_${randomUUID()}`,
      mode: "mock",
    };
  }

  const token = (opts.channelToken?.trim() || opts.envToken?.trim()) ?? "";
  const pid = opts.phoneNumberId?.trim() ?? "";
  if (!pid) {
    throw new Error("Meta phone_number_id tanımlı değil (Yönetici → Hatlar).");
  }
  if (!token) {
    throw new Error(
      "Graph API jetonu yok: hat üzerinde kayıtlı token veya WHATSAPP_ACCESS_TOKEN ekleyin; ya da yerel deneme için DEMO_MOCK_SEND=true.",
    );
  }

  const sent = await sendWhatsAppText({
    phoneNumberId: pid,
    toWaId: opts.toWaId,
    text: opts.text,
    accessToken: token,
  });
  return { waMessageId: sent.waMessageId, mode: "meta" };
}

export async function deliverOutboundTemplate(opts: {
  phoneNumberId: string | null | undefined;
  toWaId: string;
  templateName: string;
  languageCode: string;
  bodyParameter?: string;
  channelToken: string | null | undefined;
  envToken: string | undefined;
}): Promise<{ waMessageId: string; mode: "mock" | "meta" }> {
  if (isDemoMockSendEnabled()) {
    return {
      waMessageId: `mock_tpl_${Date.now()}_${randomUUID()}`,
      mode: "mock",
    };
  }

  const token = (opts.channelToken?.trim() || opts.envToken?.trim()) ?? "";
  const pid = opts.phoneNumberId?.trim() ?? "";
  if (!pid) {
    throw new Error("Meta phone_number_id tanımlı değil (Yönetici → Hatlar).");
  }
  if (!token) {
    throw new Error(
      "Graph API jetonu yok: hat üzerinde kayıtlı token veya WHATSAPP_ACCESS_TOKEN ekleyin; ya da yerel deneme için DEMO_MOCK_SEND=true.",
    );
  }

  const sent = await sendWhatsAppTemplate({
    phoneNumberId: pid,
    toWaId: opts.toWaId,
    accessToken: token,
    templateName: opts.templateName,
    languageCode: opts.languageCode,
    bodyParameter: opts.bodyParameter,
  });
  return { waMessageId: sent.waMessageId, mode: "meta" };
}

export async function deliverOutboundMedia(opts: {
  phoneNumberId: string | null | undefined;
  toWaId: string;
  buffer: ArrayBuffer;
  mimeType: string;
  filename: string;
  caption?: string;
  channelToken: string | null | undefined;
  envToken: string | undefined;
}): Promise<{ waMessageId: string; mode: "mock" | "meta"; messageType: MessageType }> {
  const kind = inferGraphMediaKind(opts.mimeType);
  const messageType = graphKindToMessageType(kind);

  if (isDemoMockSendEnabled()) {
    return {
      waMessageId: `mock_m_${Date.now()}_${randomUUID()}`,
      mode: "mock",
      messageType,
    };
  }

  const token = (opts.channelToken?.trim() || opts.envToken?.trim()) ?? "";
  const pid = opts.phoneNumberId?.trim() ?? "";
  if (!pid) {
    throw new Error("Meta phone_number_id tanımlı değil (Yönetici → Hatlar).");
  }
  if (!token) {
    throw new Error(
      "Graph API jetonu yok: hat üzerinde kayıtlı token veya WHATSAPP_ACCESS_TOKEN ekleyin; ya da yerel deneme için DEMO_MOCK_SEND=true.",
    );
  }

  const safeName =
    opts.filename.replace(/[^\w.\-()+ ]/g, "_").slice(0, 200) || "file";

  const { mediaId } = await uploadMediaToWhatsApp({
    phoneNumberId: pid,
    accessToken: token,
    buffer: opts.buffer,
    mimeType: opts.mimeType,
    filename: safeName,
    kind,
  });

  const sent = await sendWhatsAppUploadedMedia({
    phoneNumberId: pid,
    accessToken: token,
    toWaId: opts.toWaId,
    mediaId,
    kind,
    filename: safeName,
    caption: opts.caption,
  });

  return { waMessageId: sent.waMessageId, mode: "meta", messageType };
}

export function canSendFromUi(params: {
  mock: boolean;
  phoneNumberId: string | null | undefined;
  hasChannelToken: boolean;
  hasEnvToken: boolean;
}): boolean {
  if (params.mock) return true;
  return Boolean(
    params.phoneNumberId?.trim() && (params.hasChannelToken || params.hasEnvToken),
  );
}
