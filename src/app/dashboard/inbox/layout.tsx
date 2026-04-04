import { auth } from "@/auth";
import { InboxShell } from "@/components/inbox-shell";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;
  if (!user?.organizationId) redirect("/dashboard");

  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
          Gelen kutusu yükleniyor…
        </div>
      }
    >
      <InboxShell role={user.role}>{children}</InboxShell>
    </Suspense>
  );
}
