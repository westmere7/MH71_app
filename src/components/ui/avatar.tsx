import * as React from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const PALETTE = [
  "bg-[#1b2a4a]",
  "bg-[#14b6d6]",
  "bg-[#16a06a]",
  "bg-[#d9870a]",
  "bg-[#7c5cff]",
  "bg-[#e23a59]",
  "bg-[#0e8aa3]",
];

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function Avatar({
  name,
  photoUrl,
  size = 44,
  className,
}: {
  name: string | null | undefined;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const dim = { width: size, height: size };
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name ?? "avatar"}
        style={dim}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      style={{ ...dim, fontSize: size * 0.38 }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        colorFor(name ?? "?"),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
