import { emitRealtime } from "@/lib/realtime";

export function notifyInbox(
  organizationId: string,
  conversationId?: string,
  hint?: string,
) {
  emitRealtime({ type: "inbox", orgId: organizationId, conversationId, hint });
}

export function notifyContent(organizationId: string) {
  emitRealtime({ type: "content", orgId: organizationId });
}

export function notifyTeam(organizationId: string) {
  emitRealtime({ type: "team", orgId: organizationId });
}

export function notifyChannels(organizationId: string) {
  emitRealtime({ type: "channels", orgId: organizationId });
}
