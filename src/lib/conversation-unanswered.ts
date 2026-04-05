import type { MessageDirection } from "@prisma/client";

export function isConversationUnanswered(row: {
  messages: { direction: MessageDirection }[];
}): boolean {
  const last = row.messages[0];
  return !last || last.direction === "INBOUND";
}
