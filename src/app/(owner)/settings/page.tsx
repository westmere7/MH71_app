"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  CalendarPlus,
  Trash2,
  Zap,
  Camera,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  ALargeSmall,
  Lock,
} from "lucide-react";
import { useMonthCtx } from "@/components/month-provider";
import { qk, useBills, useSettings } from "@/lib/queries";
import { updateMonthMeta, createNextMonth, deleteMonth, updateSettings } from "@/lib/mutations";
import { UI_SCALES, UI_SCALE_KEY, UI_SCALE_DEFAULT, applyUiScale } from "@/lib/ui-scale";
import { computeMonthStats } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { PricingCard } from "@/components/settings/pricing-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { monthLabel, formatNumber, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MonthRow } from "@/lib/supabase/types";
import { toast } from "sonner";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { selectedMonth, months, selectedLocked, setSelectedMonthId } = useMonthCtx();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <h1 className="text-xl font-extrabold tracking-tight">Cài đặt</h1>

      <AddRemoveMonthCard
        qc={qc}
        month={selectedMonth}
        months={months}
        locked={selectedLocked}
        onCreated={(m) => {
          qc.invalidateQueries({ queryKey: qk.months });
          qc.invalidateQueries({ queryKey: ["bills"] });
          setSelectedMonthId(m.id);
        }}
      />

      {/* ---- month-specific settings (apply only to the selected month) ---- */}
      <SectionHeader
        title="Cài đặt theo tháng"
        chip={selectedMonth ? monthLabel(selectedMonth.year, selectedMonth.month) : "—"}
        tone="month"
        hint="Chỉ ảnh hưởng tháng đang chọn — không thay đổi các tháng khác."
      />
      {selectedMonth && (
        <MeterExpenseCard
          key={selectedMonth.id}
          qc={qc}
          month={selectedMonth}
          locked={selectedLocked}
        />
      )}
      {selectedMonth && <PricingCard />}

      {/* ---- universal settings (apply everywhere) ---- */}
      <SectionHeader
        title="Cài đặt chung"
        chip="mọi tháng"
        tone="universal"
        hint="Áp dụng cho toàn bộ ứng dụng."
      />
      <LockCard qc={qc} />
      <DisplayCard qc={qc} />
      <Card>
        <CardHeader>
          <CardTitle>Tài khoản</CardTitle>
        </CardHeader>
        <CardContent>
          <SignOutButton className="border-2 border-border" />
        </CardContent>
      </Card>
    </div>
  );
}

function SectionHeader({
  title,
  chip,
  tone,
  hint,
}: {
  title: string;
  chip: string;
  tone: "month" | "universal";
  hint: string;
}) {
  return (
    <div className="mt-3 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            tone === "month"
              ? "bg-warning-surface text-warning"
              : "bg-surface-2 text-muted",
          )}
        >
          {chip}
        </span>
      </div>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

/** Period that "Tạo tháng mới" will create next, based on the latest month. */
function nextPeriod(months: MonthRow[]): { year: number; month: number } {
  // months are sorted newest -> oldest, so months[0] is the latest
  const latest = months[0];
  if (!latest) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  return latest.month === 12
    ? { year: latest.year + 1, month: 1 }
    : { year: latest.year, month: latest.month + 1 };
}

/** True if the month is the current real-world calendar month. */
function isCurrentMonth(m: MonthRow): boolean {
  const now = new Date();
  return m.year === now.getFullYear() && m.month === now.getMonth() + 1;
}

/* ------------------------- add / remove month ------------------------- */
function AddRemoveMonthCard({
  qc,
  month,
  months,
  locked,
  onCreated,
}: {
  qc: ReturnType<typeof useQueryClient>;
  month: MonthRow | null;
  months: MonthRow[];
  locked: boolean;
  onCreated: (m: MonthRow) => void;
}) {
  const next = nextPeriod(months);
  const nextLabel = monthLabel(next.year, next.month);
  const create = useMutation({
    mutationFn: createNextMonth,
    onSuccess: (m) => {
      onCreated(m);
      toast.success(`Đã tạo ${monthLabel(m.year, m.month)}`);
    },
    onError: () => toast.error("Không tạo được tháng mới."),
  });

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <CalendarPlus className="h-5 w-5 text-primary" />
        <CardTitle>Thêm / xoá tháng</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted">
          Tạo kỳ tiếp theo: tự động chuyển số điện cuối kỳ thành số đầu kỳ mới, áp dụng bảng giá
          hiện tại và giữ nguyên người thuê. Quản lý sẽ nhập số điện mới ở trang ghi điện.
        </p>
        <Button
          onClick={() => {
            if (confirm(`Tạo ${nextLabel} và sinh hoá đơn cho tất cả các phòng?`)) create.mutate();
          }}
          disabled={create.isPending}
        >
          {create.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          Tạo {nextLabel}
        </Button>

        {month && (
          <div className="mt-1 flex flex-col gap-2 border-t border-border pt-4">
            <span className="text-sm font-semibold text-muted">Khu vực nguy hiểm</span>
            {locked ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Lock className="h-4 w-4 shrink-0" />
                {monthLabel(month.year, month.month)} đã qua nên đã khoá — không thể xoá.
              </p>
            ) : isCurrentMonth(month) ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Lock className="h-4 w-4 shrink-0" />
                {monthLabel(month.year, month.month)} là tháng hiện tại — không thể xoá.
              </p>
            ) : (
              <DeleteMonthButton qc={qc} month={month} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeleteMonthButton({
  qc,
  month,
}: {
  qc: ReturnType<typeof useQueryClient>;
  month: MonthRow;
}) {
  const [open, setOpen] = React.useState(false);
  const del = useMutation({
    mutationFn: () => deleteMonth(month.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.months });
      qc.invalidateQueries({ queryKey: ["bills"] });
      setOpen(false);
      toast.success(`Đã xoá ${monthLabel(month.year, month.month)}`);
    },
    onError: () => toast.error("Không xoá được tháng."),
  });

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="self-start border-danger/40 text-danger"
      >
        <Trash2 className="h-5 w-5" />
        Xoá {monthLabel(month.year, month.month)}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá {monthLabel(month.year, month.month)}?</DialogTitle>
            <DialogDescription>
              Toàn bộ hoá đơn (số điện, tiền phòng, trạng thái thu) của tháng này sẽ bị xoá
              <b> vĩnh viễn và KHÔNG THỂ khôi phục</b>. Chỉ xoá khi bạn chắc chắn nhập nhầm tháng.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button variant="danger" onClick={() => del.mutate()} disabled={del.isPending}>
              {del.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
              Xoá vĩnh viễn
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------ lock -------------------------------- */
function LockCard({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const settings = useSettings().data;
  const on = settings?.lock_past_months ?? false;

  const toggle = useMutation({
    mutationFn: (next: boolean) => updateSettings({ lock_past_months: next }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Đã lưu");
    },
    onError: () => toast.error("Lưu không thành công. Cần chạy migration 0009."),
  });

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-primary" />
        <CardTitle>Khoá tháng đã qua</CardTitle>
      </CardHeader>
      <CardContent>
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <span className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Khoá các tháng đã qua</span>
            <span className="text-sm text-muted">
              Khi bật, các tháng đã qua (trước tháng hiện tại) sẽ không thể sửa số liệu, đổi trạng
              thái, sửa giá hay xoá. Tháng hiện tại vẫn sửa bình thường. Bảo vệ số liệu cũ khỏi bị
              thay đổi nhầm.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => toggle.mutate(!on)}
            disabled={toggle.isPending}
            className={cn(
              "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
              on ? "bg-primary" : "border border-border bg-surface-2",
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                on ? "translate-x-[22px]" : "translate-x-0.5",
              )}
            />
          </button>
        </label>
      </CardContent>
    </Card>
  );
}

/* ----------------------------- display ------------------------------ */
function DisplayCard({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const settings = useSettings().data;
  const current = settings?.ui_scale ?? UI_SCALE_DEFAULT;

  const setScale = useMutation({
    mutationFn: (scale: number) => updateSettings({ ui_scale: scale }),
    // apply instantly for snappy feedback, then persist
    onMutate: (scale: number) => {
      applyUiScale(scale);
      if (typeof window !== "undefined") localStorage.setItem(UI_SCALE_KEY, String(scale));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Đã lưu cỡ hiển thị");
    },
    onError: () => toast.error("Lưu không thành công. Cần chạy migration 0007."),
  });

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <ALargeSmall className="h-5 w-5 text-primary" />
        <CardTitle>Hiển thị</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Cỡ chữ &amp; giao diện</span>
          <p className="text-sm text-muted">
            Phóng to / thu nhỏ toàn bộ ứng dụng. Áp dụng ngay và lưu cho mọi thiết bị.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {UI_SCALES.map((s) => {
            const active = Math.abs(current - s.value) < 0.001;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => !active && setScale.mutate(s.value)}
                disabled={setScale.isPending}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 transition-colors disabled:opacity-60",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-surface-2",
                )}
              >
                <span className="font-extrabold leading-none" style={{ fontSize: `${s.value}rem` }}>
                  A
                </span>
                <span className="text-xs font-semibold">{s.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------- electricity & other costs --------------------- */
function MeterExpenseCard({
  qc,
  month,
  locked,
}: {
  qc: ReturnType<typeof useQueryClient>;
  month: MonthRow;
  locked: boolean;
}) {
  const billsQ = useBills(month.id);
  const loading = billsQ.isLoading;
  const stats = computeMonthStats(billsQ.data ?? [], month);
  const filled = stats.meterFilled;

  const [otherFees, setOtherFees] = React.useState(month.other_fees);
  const saveFees = useMutation({
    mutationFn: () => updateMonthMeta(month.id, { other_fees: otherFees }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.months });
      toast.success("Đã lưu chi phí khác");
    },
    onError: () => toast.error("Lưu thất bại."),
  });

  function copyMeterLink() {
    const url = `${window.location.origin}/dien`;
    navigator.clipboard
      .writeText(`Trang ghi số điện MH71: ${url}\nMật khẩu: mh71`)
      .then(() => toast.success("Đã sao chép link + mật khẩu"))
      .catch(() => toast.error("Không sao chép được."));
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <CardTitle>Số điện &amp; chi phí</CardTitle>
        <span className="ml-auto text-sm font-semibold text-muted">
          {monthLabel(month.year, month.month)}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* meter status + note photo, one tidy block */}
        <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Số điện tháng này</span>
            {loading ? (
              <span className="text-sm text-muted">Đang tải…</span>
            ) : filled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-surface px-2.5 py-1 text-sm font-semibold text-success">
                <CheckCircle2 className="h-4 w-4" />
                Đã ghi {formatNumber(stats.unitsTotal)} số
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-surface px-2.5 py-1 text-sm font-semibold text-warning">
                <AlertCircle className="h-4 w-4" />
                Chưa ghi
              </span>
            )}
          </div>
          {filled && month.meter_filled_at && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Clock className="h-3.5 w-3.5" />
              {formatDateTime(month.meter_filled_at)}
            </span>
          )}
          <div className="flex items-center gap-3 border-t border-border pt-3">
            {month.meter_note_photo_url ? (
              <a
                href={month.meter_note_photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm font-medium text-primary hover:underline"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={month.meter_note_photo_url}
                  alt="Ảnh ghi số điện"
                  className="h-14 w-14 rounded-lg border border-border object-cover"
                />
                Xem ảnh giấy ghi số
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <Camera className="h-4 w-4" /> Chưa có ảnh giấy ghi số
              </span>
            )}
          </div>
        </div>

        {/* other expenses — single VND box, saved on blur */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="other-fees">Chi phí khác trong tháng (đ)</Label>
          <Input
            id="other-fees"
            inputMode="numeric"
            disabled={locked}
            value={otherFees ? formatNumber(otherFees) : ""}
            onChange={(e) => setOtherFees(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
            onBlur={() => {
              if (!locked && otherFees !== month.other_fees) saveFees.mutate();
            }}
            placeholder="0"
          />
          <p className="text-sm text-muted">
            {locked
              ? "Tháng này đã khoá — không thể sửa chi phí."
              : "Các chi phí thanh toán bên ngoài khác như internet, dịch vụ, v.v."}
          </p>
        </div>

        {/* link to meter page */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-4">
          <div className="text-sm">
            <div className="font-semibold">Trang ghi điện cho quản lý</div>
            <div className="text-muted">
              Mật khẩu: <span className="font-bold text-foreground">mh71</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/dien" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
                Mở trang
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={copyMeterLink}>
              <Copy className="h-4 w-4" />
              Copy link
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
