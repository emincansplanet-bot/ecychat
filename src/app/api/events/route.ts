import { requireActiveOrgSession } from "@/lib/api-session";
import { subscribeRealtime } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireActiveOrgSession();
  if (!gate.ok) return gate.response;

  const orgId = gate.session.user.organizationId;
  const enc = new TextEncoder();

  const holder: { shutdown?: () => void } = {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* kapalı */
        }
      };

      send({ type: "connected", orgId });

      const unsubscribe = subscribeRealtime((ev) => {
        if (ev.orgId !== orgId) return;
        send(ev);
      });

      const ping = setInterval(() => send({ type: "ping" }), 25000);

      let done = false;
      holder.shutdown = () => {
        if (done) return;
        done = true;
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* */
        }
      };

      req.signal.addEventListener("abort", () => holder.shutdown?.());
    },
    cancel() {
      holder.shutdown?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
