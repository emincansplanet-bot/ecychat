import { auth } from "@/auth";
import { ChannelEditCard } from "@/components/channel-edit-card";
import { WebhookSetupCallout } from "@/components/webhook-setup-callout";
import { requireAdmin, requireOrg } from "@/lib/authz";
import { resolveAppBaseUrl } from "@/lib/app-base-url";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ChannelsPage() {
  const session = await auth();
  if (!requireOrg(session)) redirect("/login");
  if (!requireAdmin(session)) redirect("/dashboard");

  const channels = await prisma.whatsAppChannel.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { internalLabel: "asc" },
    select: {
      id: true,
      internalLabel: true,
      metaPhoneNumberId: true,
      graphApiAccessToken: true,
    },
  });

  const safe = channels.map((c) => ({
    id: c.id,
    internalLabel: c.internalLabel,
    metaPhoneNumberId: c.metaPhoneNumberId,
    hasToken: Boolean(c.graphApiAccessToken?.trim()),
  }));

  const base = await resolveAppBaseUrl();
  const webhookUrl = `${base}/api/webhooks/whatsapp`;
  const verifyTokenConfigured = Boolean(process.env.WHATSAPP_VERIFY_TOKEN?.trim());

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">WhatsApp hatları</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Meta <code className="rounded bg-zinc-100 px-1 text-xs">phone_number_id</code> ve isteğe bağlı
        hat token’ı burada tutulur. Operatör arayüzünde gösterilmez.
      </p>
      <div className="mt-6">
        <WebhookSetupCallout
          webhookUrl={webhookUrl}
          verifyTokenConfigured={verifyTokenConfigured}
        />
      </div>
      <div className="mt-8 space-y-4">
        {safe.map((c) => (
          <ChannelEditCard key={c.id} {...c} />
        ))}
      </div>
    </div>
  );
}
