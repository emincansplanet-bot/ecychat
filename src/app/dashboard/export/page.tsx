import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ExportAuditForm } from "@/components/export-audit-form";
import { ExportBroadcastForm } from "@/components/export-broadcast-form";
import { ExportMessagesForm } from "@/components/export-messages-form";

export default async function ExportPage() {
  const session = await auth();
  const user = session?.user;
  if (!user?.organizationId) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Dışa aktarma</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Mesaj, yayın geçmişi ve denetim günlüğünü CSV olarak indirin (yalnızca yönetici, tüm hatlar).
        </p>
        <Link
          href="/dashboard"
          className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          ← Özete dön
        </Link>
      </div>
      <ExportMessagesForm />
      <div className="mt-10">
        <ExportBroadcastForm />
      </div>
      <div className="mt-10">
        <ExportAuditForm />
      </div>
    </div>
  );
}
