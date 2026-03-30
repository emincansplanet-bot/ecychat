export default function InboxIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-sm">
        <div
          className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-emerald-100 ring-1 ring-emerald-200/80"
          aria-hidden
        />
        <p className="text-lg font-medium text-zinc-800">Bir sohbet seçin</p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Soldaki listeden müşteri konuşmasına tıklayın. Mobil görünümde liste üstte,
          sohbet altta açılır.
        </p>
      </div>
    </div>
  );
}
