"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const urlError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    urlError === "deactivated"
      ? "Bu hesap devre dışı bırakıldı. Yöneticinize başvurun."
      : urlError === "database"
        ? [
            "PostgreSQL kapalı veya erişilemiyor.",
            "Docker Desktop → cd ecychat && docker compose up -d",
            "İlk kurulum: npx prisma migrate deploy && npm run db:seed → npm run dev",
          ].join("\n")
        : null,
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
      callbackUrl,
    });
    setPending(false);
    if (res?.error) {
      if (res.code === "database") {
        setError(
          [
            "PostgreSQL’e bağlanılamıyor. Sırayla:",
            "1) Docker Desktop’ı açın (menüde balina ikonu çalışıyor olsun).",
            "2) Terminal: cd ecychat && docker compose up -d",
            "3) İlk sefer: npx prisma migrate deploy && npm run db:seed",
            "4) npm run dev → http://localhost:3000",
            "Docker yoksa: Postgres’i yerel kurup .env içindeki DATABASE_URL ile uyumlu kullanıcı/veritabanı oluşturun.",
          ].join("\n"),
        );
      } else {
        setError(
          "E-posta veya şifre hatalı — ya da henüz kullanıcı yok. İlk kurulum: .env içindeki SEED_* ile npm run db:seed veya ./scripts/seed-docker.sh.",
        );
      }
      return;
    }
    if (res?.url) {
      // Sunucuda AUTH_URL hâlâ localhost ise NextAuth mutlak URL’yi yanlış üretebilir;
      // kullanıcıyı her zaman şu anki kökende (ör. http://IP:3000) bırak.
      try {
        const next = new URL(res.url, window.location.origin);
        if (
          next.origin !== window.location.origin &&
          (next.hostname === "localhost" || next.hostname === "127.0.0.1")
        ) {
          window.location.href = `${window.location.origin}${next.pathname}${next.search}`;
          return;
        }
      } catch {
        /* aşağıdaki atamaya düş */
      }
      window.location.href = res.url;
    }
  }

  return (
    <div className="flex min-h-full flex-1">
      <div className="relative hidden flex-1 flex-col justify-between bg-gradient-to-br from-emerald-700 via-emerald-800 to-zinc-900 p-10 text-white lg:flex">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200/90">
            ecychat
          </p>
          <h2 className="mt-6 max-w-sm text-3xl font-semibold leading-tight">
            WhatsApp operasyon paneli
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-emerald-100/90">
            Yerel demo: Docker ile PostgreSQL (docker compose up -d), ardından npm run demo.
            Giriş sonrası gelen kutusunda örnek sohbeti görebilirsiniz.
          </p>
        </div>
        <p className="text-xs text-emerald-200/70">
          Giriş: .env içindeki SEED_ADMIN_EMAIL / SEED_OPERATOR_EMAIL ve SEED_ADMIN_PASSWORD
          (tanımlı değilse admin@ecychat.local / changeme123)
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-8">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
              ecychat
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Giriş</h1>
          </div>
          <div className="mb-8 hidden lg:block">
            <h1 className="text-2xl font-semibold text-zinc-900">Hoş geldiniz</h1>
            <p className="mt-1 text-sm text-zinc-500">Hesabınızla panele girin</p>
          </div>
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm ring-1 ring-zinc-950/5"
          >
            {error ? (
              <p
                className="whitespace-pre-line rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                E-posta
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none ring-emerald-500/25 focus:border-emerald-500 focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                Şifre
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none ring-emerald-500/25 focus:border-emerald-500 focus:ring-2"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending ? "Giriş…" : "Giriş yap"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1 items-center justify-center text-zinc-500">
          Yükleniyor…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
