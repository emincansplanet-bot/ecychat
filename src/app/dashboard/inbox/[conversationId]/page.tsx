import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ContactNotesForm } from "@/components/contact-notes-form";
import { ConversationAssignControl } from "@/components/conversation-assign";
import { ConversationMarkRead } from "@/components/conversation-mark-read";
import { ConversationMessages } from "@/components/conversation-messages";
import { ConversationStatusToggle } from "@/components/conversation-status-toggle";
import { ContactConversationInsight } from "@/components/contact-conversation-insight";
import { ConversationWorkspace } from "@/components/conversation-workspace";
import { canSendFromUi, isDemoMockSendEnabled } from "@/lib/deliver-text";
import { getConversationMessageInsight } from "@/lib/conversation-insight";
import {
  getConversationForUser,
  listMessagesForConversation,
} from "@/lib/conversations";
import { normalizeContactTagsJson } from "@/lib/contact-tags";
import { inboxListPathFromSearchParams } from "@/lib/inbox-filters";
import { listOperators, listPromotions, listQuickReplies } from "@/lib/org-content";
import { contactDisplayLabel } from "@/lib/privacy";
import { prisma } from "@/lib/prisma";
import { MessageDirection } from "@prisma/client";

type PageProps = {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConversationPage({ params, searchParams }: PageProps) {
  const { conversationId } = await params;
  const sp = await searchParams;
  const inboxListHref = inboxListPathFromSearchParams(sp);
  const session = await auth();
  const user = session?.user;
  if (!user?.organizationId) redirect("/dashboard");

  const conv = await getConversationForUser({
    organizationId: user.organizationId,
    userId: user.id,
    role: user.role,
    conversationId,
  });

  if (!conv) notFound();

  const [messages, msgInsight] = await Promise.all([
    listMessagesForConversation(conv.id),
    getConversationMessageInsight(conv.id),
  ]);
  let lastInboundWaId: string | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.direction === MessageDirection.INBOUND && m.waMessageId) {
      lastInboundWaId = m.waMessageId;
      break;
    }
  }

  const title = contactDisplayLabel(
    conv.contact.displayName,
    conv.contact.waId,
    user.role,
  );
  const contactTags = normalizeContactTagsJson(conv.contact.tags);

  const ch = await prisma.whatsAppChannel.findFirst({
    where: { id: conv.channelId, organizationId: user.organizationId },
    select: { graphApiAccessToken: true, metaPhoneNumberId: true },
  });

  const mock = isDemoMockSendEnabled();
  const isArchived = conv.status === "ARCHIVED";
  const allowSendTech = canSendFromUi({
    mock,
    phoneNumberId: ch?.metaPhoneNumberId,
    hasChannelToken: Boolean(ch?.graphApiAccessToken?.trim()),
    hasEnvToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim()),
  });
  const allowSend = !isArchived && allowSendTech;

  const sendReason = isArchived
    ? "Arşivdeki konuşmaya mesaj göndermek için önce «Yeniden aç» kullanın."
    : allowSendTech
      ? undefined
      : "Göndermek için DEMO_MOCK_SEND=true (yerel demo) veya Meta phone_number_id + erişim token’ı (hat ayarı veya WHATSAPP_ACCESS_TOKEN).";

  const footnote = mock ? "Demo modu: mesajlar veritabanına yazılır, Meta’ya gitmez." : undefined;

  const [quickReplies, promotions] = await Promise.all([
    listQuickReplies(user.organizationId),
    listPromotions(user.organizationId),
  ]);

  let operators = await listOperators(user.organizationId);
  const currentOperatorId = conv.assignments[0]?.user.id ?? null;
  if (
    currentOperatorId &&
    !operators.some((o) => o.id === currentOperatorId)
  ) {
    const extra = await prisma.user.findUnique({
      where: { id: currentOperatorId },
      select: { id: true, name: true, email: true },
    });
    if (extra) operators = [...operators, extra];
  }

  return (
    <div className="flex min-h-[min(72vh,680px)] flex-1 flex-col">
      <ConversationMarkRead conversationId={conv.id} waMessageId={lastInboundWaId} />
      <div className="shrink-0 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <Link
            href={inboxListHref}
            className="mt-0.5 rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 md:hidden"
          >
            Liste
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-zinc-900">{title}</h2>
                <p className="text-sm text-zinc-500">{conv.channel.internalLabel}</p>
                {contactTags.length ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {contactTags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-emerald-100/90 px-2 py-0.5 text-[11px] font-medium text-emerald-900"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
                {isArchived ? (
                  <p className="mt-1 text-xs font-medium text-amber-800">Arşivde</p>
                ) : null}
                {user.role === "ADMIN" && conv.channel.metaPhoneNumberId ? (
                  <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                    {conv.channel.metaPhoneNumberId}
                  </p>
                ) : null}
              </div>
              <ConversationStatusToggle
                conversationId={conv.id}
                isArchived={isArchived}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <ConversationMessages conversationId={conv.id} messages={messages} />
      </div>

      <div className="grid gap-4 border-t border-zinc-200/80 bg-zinc-50/50 px-4 py-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ConversationWorkspace
            conversationId={conv.id}
            allowSend={allowSend}
            disabledReason={sendReason}
            footnote={footnote}
            quickReplies={quickReplies}
            promotions={promotions}
            templateDefaultName={process.env.WHATSAPP_TEMPLATE_NAME?.trim() ?? ""}
            templateDefaultLanguage={
              process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "tr"
            }
          />
        </div>
        <div className="space-y-4">
          {user.role === "ADMIN" ? (
            <ConversationAssignControl
              conversationId={conv.id}
              operators={operators}
              currentOperatorId={currentOperatorId}
            />
          ) : null}
          <ContactConversationInsight
            total={msgInsight.total}
            inbound={msgInsight.inbound}
            outbound={msgInsight.outbound}
            firstAt={msgInsight.firstAt}
            lastAt={msgInsight.lastAt}
          />
          <ContactNotesForm
            conversationId={conv.id}
            displayName={conv.contact.displayName ?? ""}
            notes={conv.contact.notes ?? ""}
            tags={normalizeContactTagsJson(conv.contact.tags)}
            role={user.role}
          />
        </div>
      </div>
    </div>
  );
}
