import { MessageDirection, MessageType } from "@prisma/client";
import { parseWaMediaRef } from "@/lib/whatsapp/wa-media-ref";

export type ConversationMessageRow = {
  id: string;
  direction: MessageDirection;
  type: MessageType;
  body: string | null;
  mediaUrl: string | null;
  createdAt: Date;
  sentBy: { name: string | null; email: string | null } | null;
};

export function ConversationMessages({
  conversationId,
  messages,
}: {
  conversationId: string;
  messages: ConversationMessageRow[];
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      {messages.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500">Henüz mesaj yok.</p>
      ) : (
        messages.map((m) => {
          const inbound = m.direction === MessageDirection.INBOUND;
          const attachmentSrc = parseWaMediaRef(m.mediaUrl)
            ? `/api/conversations/${conversationId}/messages/${m.id}/attachment`
            : null;

          return (
            <div
              key={m.id}
              className={`flex ${inbound ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[min(100%,28rem)] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  inbound
                    ? "bg-white text-zinc-900 ring-1 ring-zinc-200/80"
                    : "bg-emerald-600 text-white"
                }`}
              >
                {m.type !== "TEXT" ? (
                  <p className="mb-1 text-xs opacity-80">{m.type}</p>
                ) : null}

                {attachmentSrc && m.type === MessageType.IMAGE ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={attachmentSrc}
                    alt=""
                    className="mb-2 max-h-56 w-full rounded-lg object-contain"
                  />
                ) : null}

                {attachmentSrc && m.type === MessageType.VIDEO ? (
                  <video
                    src={attachmentSrc}
                    controls
                    className="mb-2 max-h-56 w-full rounded-lg"
                  />
                ) : null}

                {attachmentSrc && m.type === MessageType.AUDIO ? (
                  <audio src={attachmentSrc} controls className="mb-2 w-full" />
                ) : null}

                {attachmentSrc && m.type === MessageType.DOCUMENT ? (
                  <a
                    href={attachmentSrc}
                    target="_blank"
                    rel="noreferrer"
                    className={`mb-2 inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      inbound
                        ? "bg-zinc-100 text-emerald-800 ring-1 ring-zinc-200"
                        : "bg-emerald-500/90 text-white"
                    }`}
                  >
                    Dosyayı indir / aç
                  </a>
                ) : null}

                <p className="whitespace-pre-wrap break-words">
                  {m.body?.trim() || (inbound ? "(içerik yok)" : "(mesaj)")}
                </p>
                {!inbound && m.sentBy ? (
                  <p className="mt-1 text-xs opacity-80">
                    {m.sentBy.name ?? m.sentBy.email}
                  </p>
                ) : null}
                <p className="mt-1 text-[10px] opacity-60">
                  {m.createdAt.toLocaleString("tr-TR")}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
