import { auth } from "@/auth";
import { ContentAdmin } from "@/components/content-admin";
import { requireAdmin, requireOrg } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ContentPage() {
  const session = await auth();
  if (!requireOrg(session)) redirect("/dashboard");
  if (!requireAdmin(session)) redirect("/dashboard");

  const [quickReplies, promotions] = await Promise.all([
    prisma.quickReply.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.promotion.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">İçerik</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Hızlı yanıtlar ve promosyonlar — sohbet ekranına yansır.
      </p>
      <div className="mt-8">
        <ContentAdmin quickReplies={quickReplies} promotions={promotions} />
      </div>
    </div>
  );
}
