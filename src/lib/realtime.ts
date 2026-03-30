import { randomBytes } from "crypto";
import Redis from "ioredis";

export type RealtimeEvent = {
  type: "inbox" | "content" | "team" | "channels";
  orgId: string;
  conversationId?: string;
  /** Tarayıcı bildirimi için kısa metin (opsiyonel) */
  hint?: string;
  ts: number;
};

type Handler = (event: RealtimeEvent) => void;

const handlers = new Set<Handler>();

const CHANNEL = "ecychat:realtime";
const INSTANCE_ID = randomBytes(12).toString("hex");

type WirePayload = RealtimeEvent & { _origin?: string };

let publisher: Redis | null = null;
let subscriber: Redis | null = null;
let subscriberStarted = false;
let publishWarned = false;

function getRedisUrl(): string | null {
  const u = process.env.REDIS_URL?.trim();
  return u || null;
}

function getPublisher(): Redis | null {
  const url = getRedisUrl();
  if (!url) return null;
  if (!publisher) {
    publisher = new Redis(url, { maxRetriesPerRequest: null });
    publisher.on("error", (err: Error) => {
      if (!publishWarned) {
        publishWarned = true;
        console.warn("[ecychat] Redis publisher:", err.message);
      }
    });
  }
  return publisher;
}

function ensureRedisSubscriber(): void {
  const url = getRedisUrl();
  if (!url || subscriberStarted) return;
  subscriberStarted = true;

  subscriber = new Redis(url, { maxRetriesPerRequest: null });
  subscriber.on("error", (err: Error) => {
    console.warn("[ecychat] Redis subscriber:", err.message);
  });

  void subscriber.subscribe(CHANNEL).catch((err: unknown) => {
    console.warn(
      "[ecychat] Redis subscribe:",
      err instanceof Error ? err.message : err,
    );
  });

  subscriber.on("message", (_ch: string, message: string) => {
    let raw: WirePayload;
    try {
      raw = JSON.parse(message) as WirePayload;
    } catch {
      return;
    }
    if (raw._origin === INSTANCE_ID) return;
    const { _origin, ...event } = raw;
    void _origin;
    if (!event.type || !event.orgId || typeof event.ts !== "number") return;
    for (const h of handlers) {
      try {
        h(event as RealtimeEvent);
      } catch {
        /* */
      }
    }
  });
}

export function subscribeRealtime(handler: Handler): () => void {
  ensureRedisSubscriber();
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function emitRealtime(
  payload: Omit<RealtimeEvent, "ts"> & { ts?: number },
): void {
  const event: RealtimeEvent = {
    ...payload,
    ts: payload.ts ?? Date.now(),
  };

  for (const h of handlers) {
    try {
      h(event);
    } catch {
      /* tek dinleyici hata verirse diğerlerini bozma */
    }
  }

  const pub = getPublisher();
  if (!pub) return;

  const wire: WirePayload = { ...event, _origin: INSTANCE_ID };
  void pub.publish(CHANNEL, JSON.stringify(wire)).catch((err: Error) => {
    if (!publishWarned) {
      publishWarned = true;
      console.warn("[ecychat] Redis publish:", err.message);
    }
  });
}
