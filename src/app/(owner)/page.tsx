"use client";

import * as React from "react";
import {
  Home,
  CheckCircle2,
  Wallet,
  Banknote,
  TrendingUp,
  CalendarRange,
  ArrowUpCircle,
  ArrowDownCircle,
  Layers,
  Zap,
} from "lucide-react";
import { useMonthCtx } from "@/components/month-provider";
import { useAllBills } from "@/lib/queries";
import { computeMonthStats, pctChange, deriveCollectionStatus } from "@/lib/finance";
import type { Bill, MonthRow } from "@/lib/supabase/types";
import { StatCard } from "@/components/dashboard/stat-card";
import { HistoryChart, type HistoryPoint } from "@/components/dashboard/history-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PROGRESS_STATUS, PHASE_LABELS } from "@/lib/constants";
import { formatVND, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { months, selectedMonth, isLoading } = useMonthCtx();
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
      totalProfit += s.profitFull;
      points.push({ label, doanhthu: s.totalBilled, loinhuan: s.profitFull });
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

  return (
    <div className="flex flex-col gap-8">
      {/* ---------------- current month ---------------- */}
      <section className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold tracking-tight">Tình trạng tháng này</h2>
            <Badge className={PROGRESS_STATUS[deriveCollectionStatus(cur)].chip}>
              {PHASE_LABELS.collection_status}: {PROGRESS_STATUS[deriveCollectionStatus(cur)].label}
            </Badge>
          </div>

          <div>
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
            <div className="h-4 w-full overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-border">
              <div
                className={cn("h-full rounded-full transition-all", collectionPct > 0 && "collection-bar")}
                style={{ width: `${collectionPct}%` }}
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            label="Tỉ lệ lấp đầy"
            value={`${cur.roomCount ? Math.round((cur.occupied / cur.roomCount) * 100) : 0}%`}
            sub={`${cur.occupied}/${cur.roomCount} phòng có khách`}
            icon={Home}
            tone="info"
          />
          <StatCard
            label="Tổng sẽ thu"
            value={formatVND(cur.totalBilled)}
            icon={Wallet}
            tone="primary"
          />
          <StatCard
            label="Đã thu"
            value={formatVND(cur.collected)}
            sub={`còn ${formatVND(cur.totalBilled - cur.collected)}`}
            icon={Banknote}
            tone="info"
          />
          <StatCard
            label="Tiền điện tiêu thụ"
            value={cur.meterFilled ? formatVND(cur.electricityTotal) : "Chưa ghi"}
            sub={
              cur.meterFilled ? (
                <span className="inline-flex items-center gap-1 font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã ghi {formatNumber(cur.unitsTotal)} số điện
                </span>
              ) : (
                "quản lý chưa nhập"
              )
            }
            icon={Zap}
            tone="warning"
          />
          <StatCard
            label="Lợi nhuận (đã thu)"
            value={formatVND(cur.profitCurrent)}
            sub={prev ? "so với tháng trước" : undefined}
            trend={profitTrend}
            icon={TrendingUp}
            tone="success"
          />
          <StatCard
            label="Lợi nhuận (đủ 100%)"
            value={formatVND(cur.profitFull)}
            sub="nếu thu đủ"
            icon={Layers}
            tone="warning"
          />
        </div>
      </section>

      {/* ---------------- long term ---------------- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold tracking-tight">Tổng quan dài hạn</h2>

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
            <h3 className="mb-4 text-base font-bold">Lịch sử doanh thu & lợi nhuận</h3>
            {longTerm.points.length > 0 ? (
              <HistoryChart data={longTerm.points} />
            ) : (
              <p className="py-10 text-center text-muted">Chưa có dữ liệu lịch sử.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
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
