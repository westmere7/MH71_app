import { Skeleton } from "@/components/ui/skeleton";

// Instant route-transition UI. Because the owner pages are dynamic, Next can
// prefetch this loading state and show it the moment a nav link is tapped — the
// page "switches" immediately and the real content streams in after.
export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
