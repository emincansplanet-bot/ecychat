"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Snippet = { id: string; title: string; body: string };

export function ConversationWorkspace({
  conversationId,
  allowSend,
  disabledReason,
  footnote,
  quickReplies,
  promotions,
  templateDefaultName = "",
  templateDefaultLanguage = "tr",
}: {
  conversationId: string;
  allowSend: boolean;
  disabledReason?: string;
  footnote?: string;
  quickReplies: Snippet[];
  promotions: Snippet[];
  templateDefaultName?: string;
  templateDefaultLanguage?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [templatePending, setTemplatePending] = useState(false);
  const [templateName, setTemplateName] = useState(templateDefaultName.trim());
  const [templateLang, setTemplateLang] = useState(
    templateDefaultLanguage.trim() || "tr",
  );
  const [templateBodyParam, setTemplateBodyParam] = useState("");
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [mediaPending, setMediaPending] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [sendingPresetKey, setSendingPresetKey] = useState<string | null>(null);
  const [presetSendError, setPresetSendError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingAt = useRef(0);

  useEffect(() => {
    setTemplateName(templateDefaultName.trim());
    setTemplateLang(templateDefaultLanguage.trim() || "tr");
  }, [templateDefaultName, templateDefaultLanguage]);

  const promoCols = useMemo(
    () => (promotions.length ? "lg:grid-cols-[1fr_220px]" : ""),
    [promotions.length],
  );

  const pingTyping = useCallback(() => {
    if (!allowSend || pending) return;
    const now = Date.now();
    if (now - lastTypingAt.current < 5000) return;
    lastTypingAt.current = now;
    void fetch(`/api/conversations/${conversationId}/typing`, { method: "POST" }).catch(
      () => {},
    );
  }, [allowSend, pending, conversationId]);

  const submitMessage = useCallback(async () => {
    setError(null);
    const t = text.trim();
    if (!t || !allowSend || pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Gönderilemedi");
        return;
      }
      setText("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }, [text, allowSend, pending, conversationId, router]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitMessage();
  }

  async function copyBody(body: string, id: string) {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setText((prev) => (prev ? `${prev}\n${body}` : body));
    }
  }

  const sendPresetText = useCallback(
    async (body: string, key: string) => {
      const t = body.trim();
      if (!t || !allowSend || pending || sendingPresetKey) return;
      setPresetSendError(null);
      setSendingPresetKey(key);
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: t }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setPresetSendError(typeof data.error === "string" ? data.error : "Gönderilemedi");
          return;
        }
        router.refresh();
      } finally {
        setSendingPresetKey(null);
      }
    },
    [allowSend, pending, sendingPresetKey, conversationId, router],
  );

  const presetBusy = pending || sendingPresetKey !== null;

  async function onPickMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !allowSend) return;
    setMediaPending(true);
    setMediaError(null);
    const fd = new FormData();
    fd.append("file", file);
    const cap = mediaCaption.trim();
    if (cap) fd.append("caption", cap);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages/media`, {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMediaError(typeof data.error === "string" ? data.error : "Dosya gönderilemedi");
        return;
      }
      setMediaCaption("");
      router.refresh();
    } finally {
      setMediaPending(false);
    }
  }

  async function sendTemplate(e: React.FormEvent) {
    e.preventDefault();
    setTemplateError(null);
    const name = templateName.trim();
    if (!name || !allowSend) return;
    setTemplatePending(true);
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/messages/template`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateName: name,
            languageCode: templateLang.trim() || "tr",
            bodyParameter: templateBodyParam.trim() || undefined,
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setTemplateError(
          typeof data.error === "string" ? data.error : "Şablon gönderilemedi",
        );
        return;
      }
      setTemplateBodyParam("");
      router.refresh();
    } finally {
      setTemplatePending(false);
    }
  }

  return (
    <div className={`grid gap-4 ${promoCols}`}>
      <div className="min-w-0">
        {presetSendError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {presetSendError}
          </p>
        ) : null}
        {quickReplies.length ? (
          <div className="mb-3">
            <p className="mb-2 text-[11px] text-zinc-500">
              Başlığa tıklayınca kutuya eklenir; ok ile doğrudan gönderilir.
            </p>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((q) => {
                const sendKey = `qr:${q.id}`;
                return (
                  <div
                    key={q.id}
                    className="inline-flex overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      disabled={!allowSend || presetBusy}
                      onClick={() => setText((prev) => (prev ? `${prev}\n${q.body}` : q.body))}
                      className="px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {q.title}
                    </button>
                    <button
                      type="button"
                      disabled={!allowSend || presetBusy}
                      title="Doğrudan gönder"
                      onClick={() => void sendPresetText(q.body, sendKey)}
                      className="border-l border-zinc-200 bg-emerald-50/90 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sendingPresetKey === sendKey ? "…" : "➤"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-2 rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm">
          {!allowSend ? (
            <p className="text-sm text-amber-800">{disabledReason}</p>
          ) : null}
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <textarea
            value={text}
            onChange={(e) => {
              const v = e.target.value;
              setText(v);
              if (v.trim()) pingTyping();
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void submitMessage();
              }
            }}
            rows={4}
            disabled={pending || !allowSend}
            placeholder="Mesaj yazın…"
            className="min-h-[100px] w-full resize-y rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/25 focus:border-emerald-500 focus:ring-2 disabled:opacity-60"
          />
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={pending || !allowSend || !text.trim()}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Gönderiliyor…" : "Gönder"}
              </button>
              {footnote ? <span className="text-xs text-zinc-500">{footnote}</span> : null}
            </div>
            {allowSend ? (
              <p className="text-[11px] text-zinc-400">⌘↵ veya Ctrl+↵ ile hızlı gönder</p>
            ) : null}
          </div>
        </form>

        <div className="mt-3 space-y-2 rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm">
          <p className="text-xs font-medium text-zinc-700">Dosya / medya gönder</p>
          <p className="text-[11px] text-zinc-500">
            Görsel, video, ses veya belge (en fazla 15 MB). Meta sınırları ve oturum kuralları geçerlidir.
          </p>
          {!allowSend ? (
            <p className="text-sm text-amber-800">{disabledReason}</p>
          ) : null}
          {mediaError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {mediaError}
            </p>
          ) : null}
          <label className="block text-xs text-zinc-600">
            Altyazı (isteğe bağlı)
            <input
              value={mediaCaption}
              onChange={(e) => setMediaCaption(e.target.value)}
              disabled={!allowSend || mediaPending}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-60"
            />
          </label>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
            onChange={onPickMedia}
            disabled={!allowSend || mediaPending}
          />
          <button
            type="button"
            disabled={!allowSend || mediaPending}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mediaPending ? "Yükleniyor…" : "Dosya seç ve gönder"}
          </button>
        </div>

        <details className="mt-4 rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-medium text-zinc-800">
            Onaylı şablon (Meta)
          </summary>
          <p className="mt-2 text-xs text-zinc-500">
            Şablon adı ve dili Meta Business’ta tanımlı olmalıdır. İlk gövde değişkeni için isteğe bağlı
            metin.
          </p>
          <form onSubmit={sendTemplate} className="mt-3 space-y-2">
            {!allowSend ? (
              <p className="text-sm text-amber-800">{disabledReason}</p>
            ) : null}
            {templateError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {templateError}
              </p>
            ) : null}
            <label className="block text-xs text-zinc-600">
              Şablon adı
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                disabled={!allowSend || templatePending}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-60"
              />
            </label>
            <label className="block text-xs text-zinc-600">
              Dil kodu
              <input
                value={templateLang}
                onChange={(e) => setTemplateLang(e.target.value)}
                disabled={!allowSend || templatePending}
                placeholder="tr"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-60"
              />
            </label>
            <label className="block text-xs text-zinc-600">
              Gövde parametresi (opsiyonel)
              <input
                value={templateBodyParam}
                onChange={(e) => setTemplateBodyParam(e.target.value)}
                disabled={!allowSend || templatePending}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-60"
              />
            </label>
            <button
              type="submit"
              disabled={templatePending || !allowSend || !templateName.trim()}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {templatePending ? "Gönderiliyor…" : "Şablonu gönder"}
            </button>
          </form>
        </details>
      </div>

      {promotions.length ? (
        <aside className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 lg:max-h-[320px] lg:overflow-y-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
            Promosyonlar
          </p>
          <p className="mt-1 text-[10px] leading-snug text-emerald-800/80">
            Bu sohbete doğrudan gönder veya panoya kopyala (hata mesajları sol sütunda).
          </p>
          <ul className="mt-2 space-y-2">
            {promotions.map((p) => {
              const promoKey = `promo:${p.id}`;
              const copyKey = `promo-copy:${p.id}`;
              return (
                <li
                  key={p.id}
                  className="rounded-xl bg-white px-3 py-2 text-left text-sm text-zinc-800 shadow-sm ring-1 ring-emerald-100"
                >
                  <span className="font-medium text-emerald-900">{p.title}</span>
                  <span className="mt-1 line-clamp-3 block text-xs text-zinc-600">{p.body}</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={!allowSend || presetBusy}
                      onClick={() => void sendPresetText(p.body, promoKey)}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sendingPresetKey === promoKey ? "Gönderiliyor…" : "Gönder"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyBody(p.body, copyKey)}
                      className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-100"
                    >
                      {copied === copyKey ? "Kopyalandı" : "Kopyala"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
      ) : null}
    </div>
  );
}
