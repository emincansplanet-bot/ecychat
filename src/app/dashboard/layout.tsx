import Link from "next/link";
import { auth, signOut } from "@/auth";
import { NotificationPrompt } from "@/components/notification-prompt";
import { RealtimeBridge } from "@/components/realtime-bridge";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const navBase = [
  { href: "/dashboard", label: "Özet" },
  { href: "/dashboard/inbox", label: "Gelen kutusu" },
] as const;

const navAdmin = [
  { href: "/dashboard/channels", label: "Hatlar" },
  { href: "/dashboard/content", label: "İçerik" },
  { href: "/dashboard/broadcast", label: "Yayın" },
  { href: "/dashboard/team", label: "Ekip" },
  { href: "/dashboard/search", label: "Arama" },
  { href: "/dashboard/proxy", label: "Çıkış IP" },
  { href: "/dashboard/audit", label: "Denetim" },
  { href: "/dashboard/export", label: "Dışa aktarma" },
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let dbUser: { active: boolean } | null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { active: true },
    });
  } catch {
    redirect("/login?error=database");
  }
  if (!dbUser?.active) {
    await signOut({ redirectTo: "/login?error=deactivated" });
    redirect("/login?error=deactivated");
  }

  const isAdmin = session.user.role === "ADMIN";
  const nav = [...navBase, ...(isAdmin ? navAdmin : [])];

  return (
    <div className="flex min-h-full bg-zinc-100 text-zinc-900">
      <aside className="hidden w-52 shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex">
        <div className="border-b border-zinc-100 px-4 py-5">
          <Link
            href="/dashboard"
            className="text-sm font-bold tracking-[0.2em] text-emerald-600"
          >
            ecychat
          </Link>
          <p className="mt-1 text-xs text-zinc-500">WhatsApp paneli</p>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-zinc-100 p-3">
          <p className="truncate text-xs text-zinc-500">
            {session.user.name ?? session.user.email}
          </p>
          <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            {session.user.role === "ADMIN" ? "Yönetici" : "Operatör"}
          </span>
          <form
            className="mt-3"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="w-full rounded-lg border border-zinc-200 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Çıkış
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link href="/dashboard" className="text-sm font-bold text-emerald-600">
              ecychat
            </Link>
            <div className="flex items-center gap-2">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  {item.label}
                </Link>
              ))}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-700"
                >
                  Çıkış
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <RealtimeBridge />
          <NotificationPrompt />
          {children}
        </main>
      </div>
    </div>
  );
}
