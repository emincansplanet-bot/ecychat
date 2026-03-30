import { NextResponse } from "next/server";
import { requireActiveOrgSession } from "@/lib/api-session";
import { requireAdmin } from "@/lib/authz";
import { isDemoMockSendEnabled } from "@/lib/deliver-text";
import { prisma } from "@/lib/prisma";
import { fetchWhatsAppPhoneNumberHealth } from "@/lib/whatsapp/graph-phone-health";

type RouteContext = { params: Promise<{ channelId: string }> };

/** Meta Graph ile phone_number_id + token doğrulaması (gerçek bağlantı testi) */
export async function POST(_req: Request, context: RouteContext) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { channelId } = await context.params;
  const ch = await prisma.whatsAppChannel.findFirst({
    where: { id: channelId, organizationId: session.user.organizationId },
    select: { metaPhoneNumberId: true, graphApiAccessToken: true },
  });

  if (!ch) {
    return NextResponse.json({ error: "Hat yok" }, { status: 404 });
  }

  if (isDemoMockSendEnabled()) {
    return NextResponse.json({
      ok: true,
      mock: true,
      message: "DEMO_MOCK_SEND açık — Meta çağrısı atlandı.",
    });
  }

  const token =
    (ch.graphApiAccessToken?.trim() || process.env.WHATSAPP_ACCESS_TOKEN?.trim()) ?? "";
  const pid = ch.metaPhoneNumberId?.trim() ?? "";
  if (!pid || !token) {
    return NextResponse.json(
      { error: "phone_number_id ve erişim token’ı gerekli" },
      { status: 400 },
    );
  }

  try {
    const health = await fetchWhatsAppPhoneNumberHealth({
      phoneNumberId: pid,
      accessToken: token,
    });
    return NextResponse.json({
      ok: true,
      displayPhoneNumber: health.displayPhoneNumber ?? null,
      verifiedName: health.verifiedName ?? null,
      qualityRating: health.qualityRating ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Doğrulama başarısız";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
