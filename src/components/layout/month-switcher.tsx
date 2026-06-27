"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown, Plus, Loader2 } from "lucide-react";
import { useMonthCtx } from "@/components/month-provider";
import { qk } from "@/lib/queries";
import { createNextMonth } from "@/lib/mutations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MonthRow } from "@/lib/supabase/types";

/** Period that "Tạo tháng mới" will create next, based on the latest month. */
function nextPeriod(months: MonthRow[]): { year: number; month: number } {
  const latest = months[0]; // months are newest -> oldest
  if (!latest) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  return latest.month === 12
    ? { year: latest.year + 1, month: 1 }
    : { year: latest.year, month: latest.month + 1 };
}

export function MonthSwitcher() {
  const { months, selectedMonth, selectedMonthId, setSelectedMonthId, prevMonth, nextMonth, hasPrev, hasNext } =
    useMonthCtx();
  const qc = useQueryClient();

  // The selected month comes from client-side data (React Query + localStorage),
  // so we render a deterministic placeholder until mounted to avoid a hydration
  // mismatch between the server HTML and the first client render.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const ready = mounted && !!selectedMonth;

  const np = nextPeriod(months);
  const nextLabel = monthLabel(np.year, np.month);
  const create = useMutation({
    mutationFn: createNextMonth,
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: qk.months });
      qc.invalidateQueries({ queryKey: ["bills"] });
      setSelectedMonthId(m.id);
      toast.success(`Đã tạo ${monthLabel(m.year, m.month)}`);
    },
    onError: () => toast.error("Không tạo được tháng mới."),
  });

  function onCreate() {
    if (confirm(`Tạo ${nextLabel} và sinh hoá đơn cho tất cả các phòng?`)) create.mutate();
  }

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-border bg-surface px-1.5 py-1.5 shadow-sm">
      <NavBtn onClick={prevMonth} disabled={!mounted || !hasPrev} label="Tháng trước">
        <ChevronLeft className="h-5 w-5" />
      </NavBtn>

      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={!ready}
          className="flex min-w-[8.5rem] items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-base font-bold hover:bg-surface-2 disabled:cursor-default disabled:opacity-100"
        >
          {ready && selectedMonth ? (
            <>
              <CalendarDays className="h-4 w-4 text-primary" />
              {monthLabel(selectedMonth.year, selectedMonth.month)}
              <ChevronDown className="h-4 w-4 text-muted" />
            </>
          ) : (
            <span className="font-semibold text-muted">Đang tải…</span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-[60vh] overflow-y-auto">
          <DropdownMenuItem onSelect={() => onCreate()} className="font-semibold text-primary">
            <span className="flex items-center gap-2">
              {create.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Tạo {nextLabel}
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {months.map((m) => (
            <DropdownMenuItem
              key={m.id}
              selected={m.id === selectedMonthId}
              onSelect={() => setSelectedMonthId(m.id)}
            >
              {monthLabel(m.year, m.month)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

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
