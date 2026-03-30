/**
 * Gelen kutusu URL parametreleri (?status=archived&filter=unanswered|unassigned&q=&tag=).
 */

export type InboxFilterParts = {
  status?: "archived";
  filter?: "unanswered" | "unassigned";
  q?: string;
  tag?: string;
};

export function inboxListQueryFromParts(p: InboxFilterParts): string {
  const sp = new URLSearchParams();
  if (p.status === "archived") sp.set("status", "archived");
  if (p.filter === "unanswered") sp.set("filter", "unanswered");
  if (p.filter === "unassigned") sp.set("filter", "unassigned");
  if (p.q?.trim()) sp.set("q", p.q.trim());
  if (p.tag?.trim()) sp.set("tag", p.tag.trim());
  return sp.toString();
}

export function inboxListPathFromParts(p: InboxFilterParts): string {
  const qs = inboxListQueryFromParts(p);
  return qs ? `/dashboard/inbox?${qs}` : "/dashboard/inbox";
}

/** `/api/inbox/summary` için */
export function inboxSummarySearchFromParts(p: InboxFilterParts): string {
  const qs = inboxListQueryFromParts(p);
  return qs ? `?${qs}` : "";
}

const INBOX_PRESERVED_KEYS = ["status", "filter", "q", "tag"] as const;

/** Konuşma sayfası ?searchParams → gelen kutusu listesine güvenli geri link */
export function inboxListPathFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): string {
  const parts: InboxFilterParts = {};
  for (const key of INBOX_PRESERVED_KEYS) {
    const v = sp[key];
    if (typeof v !== "string" || !v.trim()) continue;
    if (key === "status" && v === "archived") parts.status = "archived";
    else if (key === "filter" && v === "unanswered") parts.filter = "unanswered";
    else if (key === "filter" && v === "unassigned") parts.filter = "unassigned";
    else if (key === "q") parts.q = v;
    else if (key === "tag") parts.tag = v;
  }
  return inboxListPathFromParts(parts);
}
