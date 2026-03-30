import { CopyTextButton } from "@/components/copy-text-button";

export function WebhookSetupCallout({
  webhookUrl,
  verifyTokenConfigured,
}: {
  webhookUrl: string;
  verifyTokenConfigured: boolean;
}) {
  return (
    <div className="mb-8 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-emerald-950">Meta webhook</h2>
      <p className="mt-1 text-sm text-emerald-900/85">
        Geliştirici konsolunda bu adresi <span className="font-medium">Callback URL</span> olarak
        kullanın. URL, şu anki site adresinizden türetilir; production’da{" "}
        <code className="rounded bg-white/80 px-1 text-xs">NEXT_PUBLIC_APP_URL</code> veya{" "}
        <code className="rounded bg-white/80 px-1 text-xs">AUTH_URL</code> ile sabitlemeniz önerilir.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="max-w-full break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-zinc-800 ring-1 ring-emerald-200/60">
          {webhookUrl}
        </code>
        <CopyTextButton text={webhookUrl} />
      </div>
      <p className="mt-3 text-xs text-emerald-900/80">
        Doğrulama token’ı: ortam değişkeni{" "}
        <code className="rounded bg-white/70 px-1">WHATSAPP_VERIFY_TOKEN</code>
        {verifyTokenConfigured ? " (tanımlı görünüyor)" : " — henüz .env içinde yok; Meta ile aynı değeri girin"}
        . POST imzası için üretimde{" "}
        <code className="rounded bg-white/70 px-1">WHATSAPP_APP_SECRET</code> kullanın.
      </p>
    </div>
  );
}
