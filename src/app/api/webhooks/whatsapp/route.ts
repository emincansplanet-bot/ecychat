import { NextResponse } from "next/server";
import { verifyMetaSignature } from "@/lib/meta-signature";
import { notifyInbox } from "@/lib/realtime-notify";
import { processMetaWhatsAppWebhook } from "@/lib/whatsapp/process-cloud-webhook";

/**
 * Meta WhatsApp Cloud API webhook (verify + events).
 * WHATSAPP_VERIFY_TOKEN: Meta app dashboard ile aynı olmalı.
 * WHATSAPP_APP_SECRET: POST imzası (X-Hub-Signature-256); üretimde şart.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && token && verifyToken && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (appSecret) {
    const sig = req.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(raw, sig, appSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const result = await processMetaWhatsAppWebhook(body);
    for (const oid of result.organizationIds) {
      notifyInbox(oid, undefined, "Yeni WhatsApp mesajı");
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[whatsapp webhook]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
