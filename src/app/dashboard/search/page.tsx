import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminMessageSearch } from "@/components/admin-message-search";

export default async function AdminSearchPage() {
  const session = await auth();
  const user = session?.user;
  if (!user?.organizationId) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Mesaj araması</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Yönetici: tüm organizasyon mesajlarında tam metin arama. API:{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">
            GET /api/admin/search/messages?q=…&limit=50
          </code>
        </p>
        <Link
          href="/dashboard"
          className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          ← Özete dön
        </Link>
      </div>
      <AdminMessageSearch />
    </div>
  );
}
