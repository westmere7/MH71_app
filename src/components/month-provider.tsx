"use client";

import * as React from "react";
import { useMonths, useSettings, useRealtimeSync } from "@/lib/queries";
import type { MonthRow, Settings } from "@/lib/supabase/types";

interface MonthContextValue {
  months: MonthRow[]; // sorted newest -> oldest
  settings: Settings | null;
  selectedMonth: MonthRow | null;
  selectedMonthId: string | null;
  setSelectedMonthId: (id: string) => void;
  prevMonth: () => void; // go older
  nextMonth: () => void; // go newer
  hasPrev: boolean;
  hasNext: boolean;
  isLoading: boolean;
  latestMonthId: string | null; // newest month — the only editable one when locking is on
  selectedLocked: boolean; // selected month is a passed (locked) month
}

const MonthContext = React.createContext<MonthContextValue | null>(null);
const STORAGE_KEY = "mh71.selectedMonthId";

export function MonthProvider({ children }: { children: React.ReactNode }) {
  useRealtimeSync();
  const monthsQ = useMonths();
  const settingsQ = useSettings();
  const months = React.useMemo(() => monthsQ.data ?? [], [monthsQ.data]);

  const [selectedMonthId, setSelectedMonthIdState] = React.useState<string | null>(null);

  // initialize / reconcile selection when months load
  React.useEffect(() => {
    if (months.length === 0) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const valid = stored && months.some((m) => m.id === stored) ? stored : months[0].id;
    setSelectedMonthIdState((cur) => (cur && months.some((m) => m.id === cur) ? cur : valid));
  }, [months]);

  const setSelectedMonthId = React.useCallback((id: string) => {
    setSelectedMonthIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const index = months.findIndex((m) => m.id === selectedMonthId);
  const selectedMonth = index >= 0 ? months[index] : null;
  // months are newest-first: older = higher index, newer = lower index
  const hasPrev = index >= 0 && index < months.length - 1;
  const hasNext = index > 0;

  // locking: a month is locked when the setting is on (default on) AND it has
  // truly passed — i.e. it's before the current calendar month. The current
  // month and any future months stay editable, and the newest month is always
  // editable (so there's always a working month even if it's behind).
  const latestMonthId = months.length ? months[0].id : null;
  const lockOn = settingsQ.data?.lock_past_months ?? false;
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  const isPast = (m: MonthRow) => m.year < curY || (m.year === curY && m.month < curM);
  const selectedLocked =
    lockOn && !!selectedMonth && selectedMonth.id !== latestMonthId && isPast(selectedMonth);

  const prevMonth = React.useCallback(() => {
    if (hasPrev) setSelectedMonthId(months[index + 1].id);
  }, [hasPrev, index, months, setSelectedMonthId]);
  const nextMonth = React.useCallback(() => {
    if (hasNext) setSelectedMonthId(months[index - 1].id);
  }, [hasNext, index, months, setSelectedMonthId]);

  const value: MonthContextValue = {
    months,
    settings: settingsQ.data ?? null,
    selectedMonth,
    selectedMonthId,
    setSelectedMonthId,
    prevMonth,
    nextMonth,
    hasPrev,
    hasNext,
    isLoading: monthsQ.isLoading || settingsQ.isLoading,
    latestMonthId,
    selectedLocked,
  };

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonthCtx() {
  const ctx = React.useContext(MonthContext);
  if (!ctx) throw new Error("useMonthCtx must be used within MonthProvider");
  return ctx;
}
