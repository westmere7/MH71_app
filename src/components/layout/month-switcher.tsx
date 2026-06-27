"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useMonthCtx } from "@/components/month-provider";
import { monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MonthSwitcher() {
  const { selectedMonth, prevMonth, nextMonth, hasPrev, hasNext } = useMonthCtx();

  // The selected month comes from client-side data (React Query + localStorage),
  // so we render a deterministic placeholder until mounted to avoid a hydration
  // mismatch between the server HTML and the first client render.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const ready = mounted && !!selectedMonth;

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-border bg-surface px-1.5 py-1.5 shadow-sm">
      <NavBtn onClick={prevMonth} disabled={!mounted || !hasPrev} label="Tháng trước">
        <ChevronLeft className="h-5 w-5" />
      </NavBtn>
      <div className="flex min-w-[8.5rem] items-center justify-center px-2 text-center">
        {ready && selectedMonth ? (
          <span className="flex items-center gap-1.5 text-base font-bold">
            <CalendarDays className="h-4 w-4 text-primary" />
            {monthLabel(selectedMonth.year, selectedMonth.month)}
          </span>
        ) : (
          <span className="text-base font-semibold text-muted">Đang tải…</span>
        )}
      </div>
      <NavBtn onClick={nextMonth} disabled={!mounted || !hasNext} label="Tháng sau">
        <ChevronRight className="h-5 w-5" />
      </NavBtn>
    </div>
  );
}

function NavBtn({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-surface-2",
        disabled && "pointer-events-none opacity-30",
      )}
    >
      {children}
    </button>
  );
}
