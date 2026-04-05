"use client";

import { InboxSidebar, type InboxSidebarItem } from "@/components/inbox-sidebar";
import { PRESET_CONTACT_TAGS } from "@/lib/contact-tags";
import {
  type InboxFilterParts,
  inboxListPathFromParts,
  inboxListQueryFromParts,
  inboxSummarySearchFromParts,
} from "@/lib/inbox-filters";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function inboxParts(
  scope: "open" | "archived",
  filter: string,
  q: string,
  tag: string,
): InboxFilterParts {
  let listFilter: InboxFilterParts["filter"];
  if (filter === "unanswered") listFilter = "unanswered";
  else if (filter === "unassigned") listFilter = "unassigned";
  return {
    status: scope === "archived" ? "archived" : undefined,
    filter: listFilter,
    q,
    tag,
  };
}

function adminLikeInbox(role: "ADMIN" | "OPERATOR" | "NOBETCI"): boolean {
  return role === "ADMIN" || role === "NOBETCI";
}

export function InboxShell({
  role,
  children,
}: {
  role: "ADMIN" | "OPERATOR" | "NOBETCI";
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") ?? "";
  const scope = searchParams.get("status") === "archived" ? "archived" : "open";
  const activeTag = searchParams.get("tag")?.trim() ?? "";

  const [qInput, setQInput] = useState("");
  const [qDebounced, setQDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(qInput), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const fetchKey = useMemo(
    () => `${filter}|${scope}|${qDebounced}|${activeTag}`,
    [filter, scope, qDebounced, activeTag],
  );

  const [snapshot, setSnapshot] = useState<{
    key: string;
    items: InboxSidebarItem[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const qs = inboxSummarySearchFromParts(inboxParts(scope, filter, qDebounced, activeTag));
    fetch(`/api/inbox/summary${qs}`)
      .then((r) => r.json())
      .then((data: { items?: InboxSidebarItem[] }) => {
        if (!cancelled) setSnapshot({ key: fetchKey, items: data.items ?? [] });
      })
      .catch(() => {
        if (!cancelled) setSnapshot({ key: fetchKey, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [fetchKey, filter, scope, qDebounced, activeTag]);

  useEffect(() => {
    const refetch = () => {
      const key = `${filter}|${scope}|${qDebounced}|${activeTag}`;
      const qs = inboxSummarySearchFromParts(inboxParts(scope, filter, qDebounced, activeTag));
      fetch(`/api/inbox/summary${qs}`)
        .then((r) => r.json())
        .then((data: { items?: InboxSidebarItem[] }) => {
          setSnapshot({ key, items: data.items ?? [] });
        })
        .catch(() => setSnapshot({ key, items: [] }));
    };
    window.addEventListener("ecychat:realtime", refetch);
    return () => window.removeEventListener("ecychat:realtime", refetch);
  }, [filter, scope, qDebounced, activeTag]);

  const ready = snapshot?.key === fetchKey;
  const items = ready ? snapshot!.items : [];
  const loading = !ready;

  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "bg-emerald-600 text-white shadow-sm"
        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
    }`;

  const q = qDebounced;
  const tag = activeTag;
  const openAllHref = inboxListPathFromParts(inboxParts("open", "", q, tag));
  const openUnansweredHref = inboxListPathFromParts(inboxParts("open", "unanswered", q, tag));
  const openUnassignedHref = inboxListPathFromParts(inboxParts("open", "unassigned", q, tag));
  const archivedAllHref = inboxListPathFromParts(inboxParts("archived", "", q, tag));
  const archivedUnansweredHref = inboxListPathFromParts(
    inboxParts("archived", "unanswered", q, tag),
  );
  const archivedUnassignedHref = inboxListPathFromParts(
    inboxParts("archived", "unassigned", q, tag),
  );

  const filterIsList = filter !== "unanswered" && filter !== "unassigned";

  const listQuery = useMemo(
    () => inboxListQueryFromParts(inboxParts(scope, filter, qDebounced, activeTag)),
    [scope, filter, qDebounced, activeTag],
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Gelen kutusu</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {scope === "archived"
            ? "Arşivlenmiş konuşmalar"
            : role === "ADMIN"
              ? "Açık konuşmalar — yönetici görünümü"
              : role === "NOBETCI"
                ? "Nöbet saatinde — yanıt bekleyen açık konuşmalar"
                : "Size atanmış açık konuşmalar"}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={openAllHref} className={tabClass(scope !== "archived")}>
            Açık
          </Link>
          <Link href={archivedAllHref} className={tabClass(scope === "archived")}>
            Arşiv
          </Link>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href={scope === "archived" ? archivedAllHref : openAllHref}
            className={tabClass(filterIsList)}
          >
            Tümü
          </Link>
          <Link
            href={scope === "archived" ? archivedUnansweredHref : openUnansweredHref}
            className={tabClass(filter === "unanswered")}
          >
            Yanıtsız
          </Link>
          {adminLikeInbox(role) ? (
            <Link
              href={scope === "archived" ? archivedUnassignedHref : openUnassignedHref}
              className={tabClass(filter === "unassigned")}
            >
              Atanmamış
            </Link>
          ) : null}
        </div>

        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Etiket</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Link
              href={inboxListPathFromParts(inboxParts(scope, filter, q, ""))}
              className={tabClass(!activeTag)}
            >
              Hepsi
            </Link>
            {PRESET_CONTACT_TAGS.map((preset) => {
              const on = activeTag === preset;
              return (
                <Link
                  key={preset}
                  href={inboxListPathFromParts(
                    inboxParts(scope, filter, q, on ? "" : preset),
                  )}
                  className={tabClass(on)}
                >
                  {preset}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-3">
          <label className="sr-only" htmlFor="inbox-search">
            Konuşma ara
          </label>
          <input
            id="inbox-search"
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="İsim veya numara ara…"
            className="w-full max-w-md rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex min-h-[min(72vh,680px)] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm ring-1 ring-zinc-950/5 md:flex-row">
        <aside className="flex max-h-[42vh] w-full shrink-0 flex-col border-zinc-200 bg-zinc-50/40 md:max-h-none md:w-[min(100%,380px)] md:border-r md:border-b-0 border-b">
          <div className="border-b border-zinc-200/80 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Sohbetler
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {loading ? "Yükleniyor…" : `${items.length} liste`}
            </p>
          </div>
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">Liste yükleniyor…</p>
          ) : (
            <InboxSidebar items={items} listQuery={listQuery} role={role} />
          )}
        </aside>
        <section className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-zinc-50/90 to-white">
          {children}
        </section>
      </div>
    </div>
  );
}
