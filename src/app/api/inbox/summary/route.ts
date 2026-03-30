import { NextResponse } from "next/server";
import { requireActiveOrgSession } from "@/lib/api-session";
import { listConversationsForUser } from "@/lib/conversations";
import { mapConversationRowsToInboxItems } from "@/lib/inbox-map";

export async function GET(req: Request) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;
  const session = gate.session;

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter");
  const statusParam = searchParams.get("status");
  const status = statusParam === "archived" ? "ARCHIVED" : "OPEN";
  const q = searchParams.get("q")?.trim() ?? "";
  const tag = searchParams.get("tag")?.trim() ?? "";

  let rows = await listConversationsForUser({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    role: session.user.role,
    status,
    searchQuery: q.length ? q : undefined,
    tag: tag.length ? tag : undefined,
  });

  if (filter === "unanswered") {
    rows = rows.filter((c) => {
      const last = c.messages[0];
      return !last || last.direction === "INBOUND";
    });
  }

  if (filter === "unassigned") {
    if (session.user.role !== "ADMIN") {
      rows = [];
    } else {
      rows = rows.filter((c) => c.assignments.length === 0);
    }
  }

  const items = mapConversationRowsToInboxItems(rows, {
    role: session.user.role,
  });

  return NextResponse.json({ items });
}
