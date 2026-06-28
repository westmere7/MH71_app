"use client";

import * as React from "react";
import {
  Home,
  Wallet,
  TrendingUp,
  Zap,
  CalendarRange,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMonthCtx } from "@/components/month-provider";
import { useAllBills } from "@/lib/queries";
import { computeMonthStats, pctChange } from "@/lib/finance";
import type { Bill, MonthRow } from "@/lib/supabase/types";
import { StatCard } from "@/components/dashboard/stat-card";
import { CountUp } from "@/components/dashboard/count-up";
import { HistoryChart, type HistoryPoint } from "@/components/dashboard/history-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatVND, formatNumber, formatPercent, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHART_MODES = [
  { key: "all", label: "Tất cả" },
  { key: "year", label: "Theo năm" },
  { key: "half", label: "Theo nửa năm" },
] as const;
type ChartMode = (typeof CHART_MODES)[number]["key"];

export default function DashboardPage() {
  const { months, selectedMonth, settings, isLoading } = useMonthCtx();
  const [chartMode, setChartMode] = React.useState<ChartMode>("all");
  const [yearSel, setYearSel] = React.useState<number | null>(null);
  const [halfSel, setHalfSel] = React.useState<string | null>(null); // "YYYY-1" | "YYYY-2"
  const allBillsQ = useAllBills();
  const allBills = React.useMemo(() => allBillsQ.data ?? [], [allBillsQ.data]);

  const byMonth = React.useMemo(() => {
    const map = new Map<string, Bill[]>();
    for (const b of allBills) {
      const arr = map.get(b.month_id) ?? [];
      arr.push(b);
      map.set(b.month_id, arr);
    }
    return map;
  }, [allBills]);

  const monthStats = React.useCallback(
    (m: MonthRow | null) => computeMonthStats(m ? byMonth.get(m.id) ?? [] : [], m),
    [byMonth],
  );

  const cur = monthStats(selectedMonth);

  // previous (older) month for the profit trend
  const selIdx = months.findIndex((m) => m.id === selectedMonth?.id);
  const prevMonth = selIdx >= 0 && selIdx < months.length - 1 ? months[selIdx + 1] : null;
  const prev = prevMonth ? monthStats(prevMonth) : null;
  const profitTrend = pctChange(cur.profitCurrent, prev?.profitCurrent ?? null);
  // effective electricity rate for this month (đ/số) + vs last month
  const elecRate =
    cur.unitsTotal > 0
      ? Math.round(cur.electricityTotal / cur.unitsTotal)
      : (settings?.electricity_rate ?? 0);
  const elecTrend = pctChange(cur.electricityTotal, prev?.electricityTotal ?? null);

  // ---- long-term ----
  const monthsAsc = React.useMemo(() => [...months].reverse(), [months]);
  const longTerm = React.useMemo(() => {
    let totalRevenue = 0;
    let totalProfit = 0;
    let highest: { label: string; v: number } | null = null;
    let lowest: { label: string; v: number } | null = null;
    const points: HistoryPoint[] = [];
    for (const m of monthsAsc) {
      const s = computeMonthStats(byMonth.get(m.id) ?? [], m);
      const label = `T${m.month}/${String(m.year).slice(2)}`;
      totalRevenue += s.totalBilled;
      totalProfit += s.profitCurrent;
      points.push({
        label,
        year: m.year,
        month: m.month,
        doanhthu: s.totalBilled,
        loinhuan: s.profitCurrent,
      });
      if (s.totalBilled > 0) {
        if (!highest || s.totalBilled > highest.v) highest = { label, v: s.totalBilled };
        if (!lowest || s.totalBilled < lowest.v) lowest = { label, v: s.totalBilled };
      }
    }
    return { totalRevenue, totalProfit, highest, lowest, points };
  }, [monthsAsc, byMonth]);

  const loading = isLoading || allBillsQ.isLoading;

  if (loading) return <DashboardSkeleton />;

  if (!selectedMonth) {
    return (
      <EmptyState
        title="Chưa có dữ liệu tháng"
        message="Vào mục Cài đặt và bấm “Tạo tháng mới” để bắt đầu, hoặc nạp dữ liệu mẫu."
      />
    );
  }

  const collectionPct =
    cur.totalBilled > 0 ? Math.round((cur.collected / cur.totalBilled) * 100) : 0;

  // history chart span — "all", a specific year, or a specific half-year
  const years = Array.from(new Set(months.map((m) => m.year))).sort((a, b) => b - a);
  const halfKeys = Array.from(
    new Set(months.map((m) => `${m.year}-${m.month <= 6 ? 1 : 2}`)),
  ).sort((a, b) => b.localeCompare(a)); // newest first
  const halfLabel = (key: string) => {
    const [y, h] = key.split("-");
    return `Nửa ${h === "1" ? "đầu" : "cuối"} ${y}`;
  };

  const effYear = yearSel ?? years[0] ?? selectedMonth.year;
  const effHalf = halfSel ?? halfKeys[0] ?? "";

  let chartPoints = longTerm.points;
  if (chartMode === "year") {
    chartPoints = longTerm.points.filter((p) => p.year === effYear);
  } else if (chartMode === "half") {
    const [hy, hh] = effHalf.split("-");
    chartPoints = longTerm.points.filter(
      (p) => p.year === Number(hy) && (hh === "1" ? p.month <= 6 : p.month >= 7),
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      {/* ---------------- current month ---------------- */}
      <section className="flex flex-col gap-4">
        <Card className="overflow-hidden p-0">
          {/* header photo — fades into the content below via an opacity mask */}
          <div className="h-32 w-full sm:h-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/header.jpg"
              alt="MH71"
              className="h-full w-full object-cover [mask-image:linear-gradient(to_bottom,black_0%,black_50%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_50%,transparent_100%)]"
            />
          </div>

          <div className="-mt-4 px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-muted">Tiến độ thu tiền</span>
              <span className="font-bold">
                <span className="text-success">{collectionPct}%</span>
                <span className="text-muted">
                  {" "}
                  • {cur.paidCount}/{cur.roomCount} phòng
                </span>
              </span>
            </div>
            <div className="h-6 w-full overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-border">
              <div
                className={cn("h-full rounded-full transition-all", collectionPct > 0 && "collection-bar")}
                style={{ width: `${collectionPct}%` }}
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <BigStat
            icon={Home}
            tone="info"
            label="Tỉ lệ lấp đầy"
            value={
              <CountUp
                value={cur.roomCount ? (cur.occupied / cur.roomCount) * 100 : 0}
                format={(n) => `${Math.round(n)}%`}
              />
            }
            hint={`${cur.occupied}/${cur.roomCount} phòng có người thuê`}
          />
          <BigStat
            icon={Wallet}
            tone="primary"
            label="Doanh thu"
            value={
              <>
                <CountUp value={cur.collected} format={formatVND} />
                <span className="text-base font-semibold text-muted">
                  {" "}
                  / {formatVND(cur.totalBilled)}
                </span>
              </>
            }
            hint="Đã thu / tổng sẽ thu"
          />
          <BigStat
            icon={Zap}
            tone="warning"
            label="Tiền điện"
            value={
              cur.meterFilled ? (
                <CountUp value={cur.electricityTotal} format={formatVND} />
              ) : (
                <span className="text-warning">Chưa ghi</span>
              )
            }
            hint={
              cur.meterFilled
                ? `${formatNumber(cur.unitsTotal)} số × ${formatNumber(elecRate)}đ`
                : "quản lý chưa nhập"
            }
            note={
              cur.meterFilled && selectedMonth.meter_filled_at
                ? `Ghi điện: ${formatDateTime(selectedMonth.meter_filled_at)}`
                : undefined
            }
            trend={cur.meterFilled ? elecTrend : null}
            trendNeutral
          />
          <BigStat
            icon={TrendingUp}
            tone="success"
            label="Lợi nhuận"
            value={<CountUp value={cur.profitCurrent} format={formatVND} />}
            hint="Đã thu − chi phí − điện EVN"
            trend={profitTrend}
          />
        </div>
      </section>

      {/* ---------------- long term ---------------- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold tracking-tight">Thống kê dài hạn</h2>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            label="Số tháng đã ghi"
            value={formatNumber(months.length)}
            sub="tháng"
            icon={CalendarRange}
            tone="info"
          />
          <StatCard
            label="Tổng doanh thu"
            value={formatVND(longTerm.totalRevenue)}
            icon={Wallet}
            tone="primary"
          />
          <StatCard
            label="Tổng lợi nhuận"
            value={formatVND(longTerm.totalProfit)}
            icon={TrendingUp}
            tone="success"
          />
          <StatCard
            label="Tháng cao nhất"
            value={longTerm.highest ? formatVND(longTerm.highest.v) : "—"}
            sub={longTerm.highest?.label}
            icon={ArrowUpCircle}
            tone="success"
          />
          <StatCard
            label="Tháng thấp nhất"
            value={longTerm.lowest ? formatVND(longTerm.lowest.v) : "—"}
            sub={longTerm.lowest?.label}
            icon={ArrowDownCircle}
            tone="danger"
          />
        </div>

        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold">Lịch sử doanh thu &amp; lợi nhuận</h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1 rounded-full bg-surface-2 p-1">
                  {CHART_MODES.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setChartMode(m.key)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                        chartMode === m.key
                          ? "bg-primary text-primary-foreground"
                          : "text-muted hover:text-foreground",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {chartMode === "year" && (
                  <select
                    value={effYear}
                    onChange={(e) => setYearSel(Number(e.target.value))}
                    className="rounded-full border-2 border-border bg-surface px-3 py-1 text-xs font-semibold"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        Năm {y}
                      </option>
                    ))}
                  </select>
                )}
                {chartMode === "half" && (
                  <select
                    value={effHalf}
                    onChange={(e) => setHalfSel(e.target.value)}
                    className="rounded-full border-2 border-border bg-surface px-3 py-1 text-xs font-semibold"
                  >
                    {halfKeys.map((k) => (
                      <option key={k} value={k}>
                        {halfLabel(k)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            {chartPoints.length > 0 ? (
              <HistoryChart data={chartPoints} />
            ) : (
              <p className="py-10 text-center text-muted">Chưa có dữ liệu lịch sử.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

const BIG_TONES = {
  primary: "bg-primary/12 text-primary",
  success: "bg-success-surface text-success",
  info: "bg-info-surface text-info",
  warning: "bg-warning-surface text-warning",
} as const;

function BigStat({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  note,
  trend,
  trendNeutral,
}: {
  icon: LucideIcon;
  tone: keyof typeof BIG_TONES;
  label: string;
  value: React.ReactNode;
  hint: string;
  note?: string;
  trend?: number | null;
  trendNeutral?: boolean; // muted (no good/bad colour) — e.g. electricity usage
}) {
  return (
    <Card className="flex flex-col gap-2 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted">{label}</span>
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", BIG_TONES[tone])}>
          <Icon className="h-6 w-6" />
        </span>
      </div>
      <div className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums sm:text-[2rem]">
        {value}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <span>{hint}</span>
        {trend != null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-semibold",
              trendNeutral ? "text-muted" : trend >= 0 ? "text-success" : "text-danger",
            )}
          >
            {trend >= 0 ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            {formatPercent(trend)}
          </span>
        )}
      </div>
      {note && <div className="text-xs text-muted/80">{note}</div>}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <Card className="mx-auto mt-10 max-w-md">
      <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-muted">{message}</p>
      </CardContent>
    </Card>
  );
}
