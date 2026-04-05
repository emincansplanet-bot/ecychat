"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type InboxSidebarItem = {
  id: string;
  href: string;
  title: string;
  preview: string;
  channelLabel: string;
  metaHint?: string | null;
  assignees?: string | null;
  tags?: string[];
  /** Son mesaj müşteriden veya konuşma boş */
  unanswered?: boolean;
};

export function InboxSidebar({
  items,
  role,
  listQuery = "",
}: {
  items: InboxSidebarItem[];
  role: "ADMIN" | "OPERATOR" | "NOBETCI";
  /** Gelen kutusu filtrelerini konuşma URL’sinde koru (geri dönüş için) */
  listQuery?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col overflow-y-auto p-2">
      {items.length === 0 ? (
        <p className="px-3 py-10 text-center text-sm leading-relaxed text-zinc-500">
          Henüz konuşma yok. Seed veya webhook ile mesaj geldikçe burada listelenir.
        </p>
      ) : (
        items.map((item) => {
          const active = pathname === item.href;
          const href = listQuery ? `${item.href}?${listQuery}` : item.href;
          return (
            <Link
              key={item.id}
              href={href}
              className={`mb-1 rounded-xl px-3 py-3 transition ${
                active
                  ? "bg-emerald-50 ring-1 ring-emerald-200/90"
                  : "hover:bg-zinc-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-medium text-zinc-900">{item.title}</p>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  {item.unanswered ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-900">
                      Yanıt bekle
                    </span>
                  ) : null}
                  <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                    {item.channelLabel}
                  </span>
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">{item.preview}</p>
              {item.tags && item.tags.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
              {(role === "ADMIN" || role === "NOBETCI") && item.assignees ? (
                <p className="mt-1 text-xs text-zinc-400">Atanan: {item.assignees}</p>
              ) : null}
              {(role === "ADMIN" || role === "NOBETCI") && item.metaHint ? (
                <p className="mt-0.5 font-mono text-[10px] text-zinc-400">{item.metaHint}</p>
              ) : null}
            </Link>
          );
        })
      )}
    </nav>
  );
}
