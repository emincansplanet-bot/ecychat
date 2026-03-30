"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold text-zinc-900">Sunucu hatası</h1>
      <p className="max-w-md text-sm text-zinc-600">
        İstek işlenirken bir sorun oluştu. Geliştirme modunda aşağıdaki ayrıntı terminalde de görünür.
      </p>
      {process.env.NODE_ENV === "development" ? (
        <pre className="max-h-48 max-w-full overflow-auto rounded-lg bg-zinc-100 p-3 text-left text-xs text-red-800">
          {error.message}
        </pre>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Tekrar dene
      </button>
    </div>
  );
}
