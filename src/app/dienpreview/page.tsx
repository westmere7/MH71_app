// TEMPORARY preview-only page (public via proxy /dien* rule). Delete after use.
import { cn } from "@/lib/utils";

export default function DienPreview() {
  const collectionPct = 92;
  const paidCount = 24;
  const roomCount = 26;
  const monthLabel = "Tháng 6 / 2026";

  return (
    <main className="min-h-screen bg-background px-4 py-5 md:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="flex flex-col gap-6">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/header.jpg"
              alt="MH71"
              className="h-44 w-full rounded-2xl object-cover sm:h-56"
            />

            <div className="relative z-10 -mt-12 rounded-2xl border border-border bg-surface p-4 shadow-xl ring-1 ring-black/5 sm:-mt-12 sm:p-5">
              <div className="mb-3 flex items-end justify-between gap-3">
                <span className="flex items-baseline gap-2">
                  <span className="text-base font-bold sm:text-lg">Tiến độ thu tiền</span>
                  <span className="text-sm font-semibold text-muted">{monthLabel}</span>
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold tabular-nums text-success sm:text-2xl">
                    {collectionPct}%
                  </span>
                  <span className="text-sm font-semibold text-muted">
                    {paidCount}/{roomCount} phòng
                  </span>
                </span>
              </div>
              <div className="h-8 w-full overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-border">
                <div
                  className={cn("h-full rounded-full transition-all", collectionPct > 0 && "collection-bar")}
                  style={{ width: `${collectionPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {["Tỉ lệ lấp đầy", "Doanh thu", "Tiền điện", "Lợi nhuận"].map((l) => (
              <div key={l} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 sm:p-6">
                <span className="text-sm font-semibold text-muted">{l}</span>
                <span className="text-2xl font-extrabold sm:text-[2rem]">000</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
