"use client";

import * as React from "react";
import Link from "next/link";
import { Search, X, Banknote, Zap, Users, Lock, FlaskConical, MousePointerClick, Box, Square } from "lucide-react";
import { useMonthCtx } from "@/components/month-provider";
import { useRooms, useBills, useCurrentTenants, useAllTenants, useAllBills } from "@/lib/queries";
import { computeMonthStats } from "@/lib/finance";
import { isPaidStatus, isUnderpaid, paidAmountOf } from "@/lib/constants";
import { formatNumber, formatVND, monthLabel } from "@/lib/format";
import { CountUp } from "@/components/dashboard/count-up";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FloorPlan } from "@/components/floor-plan/floor-plan";
import { FloorPlan3D } from "@/components/floor-plan/floor-plan-3d";
import { RoomSheet, type SheetSide } from "@/components/floor-plan/room-sheet";
import {
  matchesQuery,
  slotOf,
  type Lens,
  type Orientation,
  type RoomView,
} from "@/components/floor-plan/layout";
import { cn } from "@/lib/utils";
import type { Bill, MonthRow, Tenant } from "@/lib/supabase/types";

const LENS_KEY = "mh71.sodo.lens";
const VIEW3D_KEY = "mh71.sodo.3d";
// the horizontal plan needs ~58rem to breathe; below that it stands upright
const HORIZONTAL_MIN_REM = 58;

const LENSES: { value: Lens; label: string; icon: React.ElementType }[] = [
  { value: "payment", label: "Thu tiền", icon: Banknote },
  { value: "power", label: "Số điện", icon: Zap },
  { value: "people", label: "Người thuê", icon: Users },
];

// Experimental: the building drawn as a floor plan, with each room's live
// data on top. Tap a room → the same editable card as Phòng thuê.
export default function FloorPlanPage() {
  const { selectedMonth, settings, isLoading, months, selectedLocked } = useMonthCtx();
  const roomsQ = useRooms();
  const billsQ = useBills(selectedMonth?.id ?? null);
  const tenantsQ = useCurrentTenants();
  const allTenantsQ = useAllTenants();
  const allBillsQ = useAllBills();

  // ---- orientation: measured from the space we actually get ----
  const [orientation, setOrientation] = React.useState<Orientation | null>(null);
  const [desktop, setDesktop] = React.useState(false);
  const roRef = React.useRef<ResizeObserver | null>(null);
  const wrapRef = React.useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!el) return;
    const measure = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setOrientation(el.clientWidth >= HORIZONTAL_MIN_REM * rem ? "horizontal" : "vertical");
    };
    measure();
    roRef.current = new ResizeObserver(measure);
    roRef.current.observe(el);
  }, []);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // ---- lens (remembered) + search ----
  const [lens, setLensState] = React.useState<Lens>("payment");
  React.useEffect(() => {
    try {
      const v = localStorage.getItem(LENS_KEY) as Lens | null;
      if (v && LENSES.some((l) => l.value === v)) setLensState(v);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const setLens = (l: Lens) => {
    setLensState(l);
    try {
      localStorage.setItem(LENS_KEY, l);
    } catch {
      /* ignore */
    }
  };
  const [query, setQuery] = React.useState("");

  // ---- 3D view: desktop with a real mouse only (remembered) ----
  const [can3d, setCan3d] = React.useState(false);
  const [view3dPref, setView3dPref] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const on = () => setCan3d(mq.matches);
    on();
    mq.addEventListener("change", on);
    try {
      setView3dPref(localStorage.getItem(VIEW3D_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
    return () => mq.removeEventListener("change", on);
  }, []);
  const view3d = can3d && view3dPref;
  const setView3d = (on: boolean) => {
    setView3dPref(on);
    try {
      localStorage.setItem(VIEW3D_KEY, on ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  // ---- selection / sheet ----
  const [selectedCode, setSelectedCode] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [side, setSide] = React.useState<SheetSide>("right");

  // ---- data → one view per room ----
  const prevMonth = React.useMemo(() => {
    const i = months.findIndex((m) => m.id === selectedMonth?.id);
    return i >= 0 && i < months.length - 1 ? months[i + 1] : null;
  }, [months, selectedMonth?.id]);

  const views = React.useMemo(() => {
    const out = new Map<string, RoomView>();
    const billByRoom = new Map<string, Bill>();
    for (const b of billsQ.data ?? []) billByRoom.set(b.room_id, b);
    const tenantById = new Map<string, Tenant>();
    for (const t of allTenantsQ.data ?? []) tenantById.set(t.id, t);
    const tenantByRoom = new Map<string, Tenant>();
    for (const t of tenantsQ.data ?? []) tenantByRoom.set(t.room_id, t);

    const now = new Date();
    const prevIsPast = (m: MonthRow | null) =>
      !!m && (m.year < now.getFullYear() || (m.year === now.getFullYear() && m.month < now.getMonth() + 1));
    const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
    const prevBills = prevMonth ? (allBillsQ.data ?? []).filter((b) => b.month_id === prevMonth.id) : [];

    for (const room of roomsQ.data ?? []) {
      const bill = billByRoom.get(room.id) ?? null;
      const vacant = bill?.payment_status === "vacant";
      // the person on the bill (by id), else the current tenant when no bill yet
      const tenant = vacant
        ? null
        : ((bill?.tenant_id ? tenantById.get(bill.tenant_id) : undefined) ??
          (!bill ? tenantByRoom.get(room.id) : null) ??
          null);
      const name = vacant ? null : (bill?.tenant_name ?? tenant?.name ?? null);
      const status = bill ? (bill.payment_status === "partial" ? "unpaid" : bill.payment_status) : null;
      const paid = !!bill && isPaidStatus(bill.payment_status);
      const underpaid = !!bill && isUnderpaid(bill);

      // last month's debt — same person only (mirrors Phòng thuê / Tổng quan)
      let prevOwed = 0;
      if (bill?.tenant_id && prevIsPast(prevMonth)) {
        const pb = prevBills.find(
          (b) => b.tenant_id === bill.tenant_id && b.room_id === room.id && norm(b.tenant_name) === norm(bill.tenant_name),
        );
        if (pb && pb.payment_status !== "vacant") {
          const owed = pb.total - paidAmountOf(pb);
          if (owed > 0) prevOwed = owed;
        }
      }

      out.set(room.code, {
        room,
        bill,
        tenant,
        name,
        phone: vacant ? null : (bill?.tenant_phone ?? tenant?.phone ?? null),
        photoUrl: tenant?.photo_url ?? null,
        vacant: vacant || (!bill && !tenant),
        status,
        paid,
        underpaid,
        owed: bill && !vacant ? Math.max(0, bill.total - paidAmountOf(bill)) : 0,
        prevOwed,
        recorded: bill?.reading_new != null,
      });
    }
    return out;
  }, [roomsQ.data, billsQ.data, tenantsQ.data, allTenantsQ.data, allBillsQ.data, prevMonth]);

  // rooms in app order (K1, K2, P1…) — used for ← → stepping in the sheet
  const ordered = React.useMemo(
    () => [...views.values()].sort((a, b) => a.room.sort_order - b.room.sort_order),
    [views],
  );
  const offPlan = ordered.filter((v) => !slotOf(v.room.code));

  const bills = billsQ.data ?? [];
  const stats = computeMonthStats(bills, selectedMonth);
  const maxUnits = Math.max(1, ...bills.map((b) => b.units));
  const recordedCount = bills.filter((b) => b.reading_new != null).length;
  const debtCount = ordered.filter((v) => v.prevOwed > 0).length;
  const matches = query.trim() ? ordered.filter((v) => matchesQuery(v, query)) : [];

  // deep link: /so-do?room=P12 opens that room
  React.useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("room");
    if (code && views.has(code.toUpperCase())) {
      setSelectedCode(code.toUpperCase());
      setSheetOpen(true);
    }
    // only once, when the data first arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views.size > 0]);

  function select(code: string, el: HTMLElement | null) {
    if (!sheetOpen && el) {
      // open the drawer on the side AWAY from the room so it stays visible
      const r = el.getBoundingClientRect();
      setSide(r.left + r.width / 2 > window.innerWidth * 0.55 ? "left" : "right");
    }
    setSelectedCode(code);
    setSheetOpen(true);
  }

  function step(dir: -1 | 1) {
    if (!selectedCode || ordered.length === 0) return;
    const i = ordered.findIndex((v) => v.room.code === selectedCode);
    const next = ordered[(i + dir + ordered.length) % ordered.length];
    setSelectedCode(next.room.code);
  }

  const loading = isLoading || roomsQ.isLoading || billsQ.isLoading;

  if (!isLoading && !settings?.show_floor_plan) {
    return (
      <Card className="mx-auto mt-10 max-w-md">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <FlaskConical className="h-8 w-8 text-info" />
          <p className="text-muted">Tab Sơ đồ đang tắt. Bật trong Cài đặt → Tính năng thử nghiệm.</p>
          <Link href="/settings" className="font-semibold text-primary hover:underline">
            Mở Cài đặt
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!loading && !selectedMonth) {
    return (
      <Card className="mx-auto mt-10 max-w-md">
        <CardContent className="p-8 text-center text-muted">
          Chưa có dữ liệu tháng. Vào Cài đặt để tạo tháng mới.
        </CardContent>
      </Card>
    );
  }

  const pct = stats.totalBilled > 0 ? Math.round((stats.collected / stats.totalBilled) * 100) : 0;

  return (
    <div className="flex w-full flex-col gap-4">
      {/* title + search */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight">Sơ đồ phòng</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-info-surface px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-info">
              <FlaskConical className="h-3 w-3" />
              Thử nghiệm
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
            {selectedMonth ? monthLabel(selectedMonth.year, selectedMonth.month) : "…"}
            {selectedLocked && (
              <span className="inline-flex items-center gap-1 font-semibold">
                · <Lock className="h-3.5 w-3.5" /> đã khoá
              </span>
            )}
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[0]) {
                const el = document.querySelector<HTMLElement>(`[data-fp-room="${matches[0].room.code}"]`);
                select(matches[0].room.code, el);
              }
              if (e.key === "Escape") setQuery("");
            }}
            placeholder="Tìm tên, SĐT hoặc số phòng…"
            aria-label="Tìm phòng"
            className="h-11 w-full rounded-xl border-2 border-input bg-surface pl-10 pr-24 text-base placeholder:text-muted/60 focus-visible:border-primary focus-visible:outline-none"
          />
          {query && (
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <span className={cn("text-xs font-semibold", matches.length ? "text-primary" : "text-danger")}>
                {matches.length ? `${matches.length} phòng` : "Không thấy"}
              </span>
              <button
                type="button"
                aria-label="Xoá tìm kiếm"
                onClick={() => setQuery("")}
                className="rounded-lg p-1 text-muted hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* headline numbers */}
      {loading ? (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[5.5rem] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Stat
            className="col-span-2 lg:col-span-1"
            label="Đã thu"
            active={lens === "payment"}
            onClick={() => setLens("payment")}
            value={<CountUp value={stats.collected} format={formatVND} />}
            sub={`/ ${formatVND(stats.totalBilled)} · ${pct}%`}
          >
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="collection-bar h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </Stat>
          <Stat
            label="Phòng đã thu"
            active={lens === "payment"}
            onClick={() => setLens("payment")}
            value={
              <>
                {stats.paidCount}
                <span className="text-base font-semibold text-muted">/{stats.occupied}</span>
              </>
            }
            sub={
              debtCount > 0
                ? `${stats.occupied - stats.paidCount} chưa thu · ${debtCount} nợ cũ`
                : `${stats.occupied - stats.paidCount} phòng chưa thu`
            }
            subTone={debtCount > 0 ? "warning" : undefined}
          />
          <Stat
            label="Đang ở"
            active={lens === "people"}
            onClick={() => setLens("people")}
            value={
              <>
                {stats.occupied}
                <span className="text-base font-semibold text-muted">/{ordered.length}</span>
              </>
            }
            sub={`${ordered.length - stats.occupied} phòng trống`}
          />
          <Stat
            label="Tổng số điện"
            active={lens === "power"}
            onClick={() => setLens("power")}
            value={
              <>
                <CountUp value={stats.unitsTotal} format={(n) => formatNumber(Math.round(n))} />
                <span className="ml-1 text-base font-semibold text-muted">số</span>
              </>
            }
            sub={recordedCount < bills.length ? `Đã ghi ${recordedCount}/${bills.length} phòng` : "Đã ghi đủ"}
            subTone={recordedCount < bills.length ? "warning" : undefined}
          />
        </div>
      )}

      {/* lens switch + legend */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <div role="tablist" aria-label="Chế độ xem" className="inline-flex rounded-2xl border border-border bg-surface p-1 shadow-sm">
          {LENSES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              role="tab"
              aria-selected={lens === value}
              onClick={() => setLens(value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all sm:px-4",
                lens === value ? "bg-primary text-primary-foreground shadow" : "text-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <Legend lens={lens} maxUnits={maxUnits} />
          {can3d && (
            <div role="tablist" aria-label="Kiểu xem" className="inline-flex rounded-2xl border border-border bg-surface p-1 shadow-sm">
              {[
                { on: false, label: "2D", icon: Square },
                { on: true, label: "3D", icon: Box },
              ].map(({ on, label, icon: Icon }) => (
                <button
                  key={label}
                  role="tab"
                  aria-selected={view3d === on}
                  onClick={() => setView3d(on)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition-all",
                    view3d === on ? "bg-brand text-brand-foreground shadow" : "text-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* the plan */}
      <div ref={wrapRef} className="w-full">
        {loading || !orientation || !selectedMonth ? (
          <Skeleton className={cn("w-full rounded-3xl", orientation === "horizontal" ? "h-[24rem]" : "h-[70vh]")} />
        ) : view3d ? (
          <FloorPlan3D
            views={views}
            lens={lens}
            query={query}
            selectedCode={sheetOpen ? selectedCode : null}
            maxUnits={maxUnits}
            onSelect={select}
          />
        ) : (
          <div className={cn(orientation === "vertical" && "mx-auto max-w-xl")}>
            <FloorPlan
              views={views}
              orientation={orientation}
              lens={lens}
              query={query}
              selectedCode={sheetOpen ? selectedCode : null}
              maxUnits={maxUnits}
              onSelect={select}
            />
          </div>
        )}
      </div>

      {offPlan.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-muted">Ngoài sơ đồ:</span>
          {offPlan.map((v) => (
            <button
              key={v.room.id}
              data-fp-room={v.room.code}
              onClick={(e) => select(v.room.code, e.currentTarget)}
              className="rounded-full border border-border bg-surface px-3 py-1 font-semibold hover:bg-surface-2"
            >
              {v.room.code}
              {v.name ? ` · ${v.name}` : ""}
            </button>
          ))}
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <MousePointerClick className="h-3.5 w-3.5" />
        Bấm vào một phòng để thu tiền, sửa thông tin hoặc xem thẻ thanh toán
        <span className="hidden md:inline">
          {" "}
          · ← → để chuyển phòng{can3d && !view3d ? " · thử chế độ 3D" : ""}
        </span>
      </p>

      {selectedMonth && orientation && (
        <RoomSheet
          view={selectedCode ? (views.get(selectedCode) ?? null) : null}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          desktop={desktop}
          side={side}
          orientation={view3d ? "horizontal" : orientation}
          month={selectedMonth}
          buildingName={settings?.building_name ?? "MH71"}
          locked={selectedLocked}
          onStep={step}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  subTone,
  active,
  onClick,
  className,
  children,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  subTone?: "warning";
  active?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-surface px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        active ? "border-primary/50" : "border-border",
        className,
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 truncate text-xl font-extrabold tabular-nums sm:text-2xl">{value}</div>
      {sub && (
        <div className={cn("truncate text-xs font-medium", subTone === "warning" ? "text-warning" : "text-muted")}>
          {sub}
        </div>
      )}
      {children}
    </button>
  );
}

function Legend({ lens, maxUnits }: { lens: Lens; maxUnits: number }) {
  const sw = "h-3.5 w-3.5 rounded-[5px] border";
  const item = "inline-flex items-center gap-1.5";
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs font-medium text-muted">
      {lens === "payment" && (
        <>
          <span className={item}>
            <span className={cn(sw, "border-success/40 bg-[color-mix(in_srgb,var(--success)_25%,var(--surface))]")} />
            Đã thu
          </span>
          <span className={item}>
            <span className={cn(sw, "border-warning/50 bg-[color-mix(in_srgb,var(--warning)_25%,var(--surface))]")} />
            Trả thiếu
          </span>
          <span className={item}>
            <span className={cn(sw, "border-danger/40 bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))]")} />
            Chưa thu
          </span>
          <span className={item}>
            <span className={cn(sw, "fp-hatch border-dashed border-border")} />
            Trống
          </span>
          <span className={cn(item, "text-warning")}>▲ Nợ tháng trước</span>
        </>
      )}
      {lens === "power" && (
        <>
          <span className={item}>
            0
            <span
              className="h-3.5 w-24 rounded-full border border-primary/30"
              style={{
                background:
                  "linear-gradient(to right, color-mix(in srgb, var(--primary) 6%, var(--surface)), color-mix(in srgb, var(--primary) 52%, var(--surface)))",
              }}
            />
            {formatNumber(maxUnits)} số
          </span>
          <span className={item}>
            <span className={cn(sw, "fp-hatch border-dashed border-border")} />
            Chưa ghi
          </span>
        </>
      )}
      {lens === "people" && (
        <>
          <span className={item}>Thời gian đã ở · ảnh đại diện</span>
          <span className={item}>
            <span className={cn(sw, "fp-hatch border-dashed border-border")} />
            Trống
          </span>
        </>
      )}
    </div>
  );
}
