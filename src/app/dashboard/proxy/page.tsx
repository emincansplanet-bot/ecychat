import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireAdmin, requireOrg } from "@/lib/authz";

export default async function ProxyInfoPage() {
  const session = await auth();
  if (!requireOrg(session)) redirect("/dashboard");
  if (!requireAdmin(session)) redirect("/dashboard");

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Çıkış IP / proxy</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Brief Faz 2: operatör başına sabit çıkış IP’si ve sağlık paneli burada konumlanacak.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800"
      >
        ← Özete dön
      </Link>

      <div className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Şu anki durum</h2>
        <p className="text-sm leading-relaxed text-zinc-600">
          ECYChat bu sürümde Meta Cloud API çağrılarını sunucu ortamınızın çıkış IP’si ile yapar.
          Operatör tarayıcısından doğrudan WhatsApp’a bağlantı yoktur; “statik proxy” tedarikçi veya
          şirket içi egress için ayrı entegrasyon (API health, atama, süre) sonraki sürümlerde
          eklenebilir.
        </p>
        <ul className="list-inside list-disc text-sm text-zinc-600">
          <li>Hat doğrulama: Yönetici → Hatlar → «Bağlantıyı doğrula»</li>
          <li>Webhook: Hatlar sayfasındaki tam URL’yi Meta geliştirici konsoluna girin</li>
          <li>
            Uygulama / DB:{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">GET /api/health</code> ve{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">GET /api/health?db=1</code> — kimlik
            gerektirmez
          </li>
        </ul>
      </div>
    </div>
  );
}
