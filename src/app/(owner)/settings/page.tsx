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
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  ALargeSmall,
  Lock,
  RotateCcw,
  Mail,
  Send,
} from "lucide-react";
import { useMonthCtx } from "@/components/month-provider";
import { qk, useBills, useSettings } from "@/lib/queries";
import { createNextMonth, deleteMonth, resetMonth, updateSettings, updateMonthMeta } from "@/lib/mutations";
import { uploadImage, deleteImage } from "@/lib/upload";
import { UI_SCALES, UI_SCALE_KEY, UI_SCALE_DEFAULT, applyUiScale } from "@/lib/ui-scale";
import { computeMonthStats } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <MeterExpenseCard key={selectedMonth.id} qc={qc} month={selectedMonth} locked={selectedLocked} />
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
      <QrCodeSettingsCard qc={qc} />
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
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Lock className="h-4 w-4 shrink-0" />
                  {monthLabel(month.year, month.month)} là tháng hiện tại — không thể xoá.
                </p>
                <ResetMonthButton qc={qc} month={month} />
              </div>
            ) : (
              <DeleteMonthButton qc={qc} month={month} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResetMonthButton({
  qc,
  month,
}: {
  qc: ReturnType<typeof useQueryClient>;
  month: MonthRow;
}) {
  const [open, setOpen] = React.useState(false);
  const reset = useMutation({
    mutationFn: () => resetMonth(month.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.months });
      qc.invalidateQueries({ queryKey: ["bills"] });
      setOpen(false);
      toast.success(`Đã thiết lập lại ${monthLabel(month.year, month.month)}`);
    },
    onError: () => toast.error("Không thiết lập lại được tháng."),
  });

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="self-start border-warning/40 text-warning hover:bg-warning-surface/30"
      >
        <RotateCcw className="h-5 w-5" />
        Thiết lập lại {monthLabel(month.year, month.month)}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thiết lập lại {monthLabel(month.year, month.month)}?</DialogTitle>
            <DialogDescription>
              Hành động này sẽ xoá toàn bộ dữ liệu đang ghi (số điện mới, trạng thái thanh toán, ảnh ghi chú, tiền điện EVN) của tháng hiện tại và <b>tạo lại từ đầu dựa trên số liệu cuối tháng trước</b>.
              <br /><br />
              Thông tin người thuê hiện tại sẽ được cập nhật. Dữ liệu đã nhập của tháng này sẽ bị mất <b>vĩnh viễn và KHÔNG THỂ khôi phục</b>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={() => reset.mutate()} disabled={reset.isPending}>
              {reset.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RotateCcw className="h-5 w-5" />
              )}
              Xác nhận thiết lập lại
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
  const settings = useSettings().data;
  const loading = billsQ.isLoading;
  const stats = computeMonthStats(billsQ.data ?? [], month);
  const filled = stats.meterFilled;

  // EVN bill (owner's actual electricity cost) — manual, per month
  const [evn, setEvn] = React.useState(month.evn_bill ?? 0);
  const saveEvn = useMutation({
    mutationFn: () => updateMonthMeta(month.id, { evn_bill: evn }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.months });
      toast.success("Đã lưu tiền điện EVN");
    },
    onError: () => toast.error("Lưu thất bại. Cần chạy migration 0010."),
  });

  // email notified when số điện is filled — universal (not tied to this month).
  // One address for now; verify a domain in Resend later to send to more.
  const [notifyEmail, setNotifyEmail] = React.useState("");
  React.useEffect(() => {
    setNotifyEmail(settings?.notify_email ?? "");
  }, [settings?.notify_email]);

  const saveNotify = useMutation({
    mutationFn: () => updateSettings({ notify_email: notifyEmail.trim() || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Đã lưu email nhận thông báo");
    },
    onError: () => toast.error("Lưu không thành công. Cần chạy migration 0013."),
  });
  const notifyChanged = notifyEmail.trim() !== (settings?.notify_email ?? "");

  function saveNotifyEmail() {
    const e = notifyEmail.trim();
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast.error("Email không hợp lệ.");
      return;
    }
    saveNotify.mutate();
  }

  // full URL of the meter page, resolved on the client (for display + copy)
  const [origin, setOrigin] = React.useState("");
  React.useEffect(() => setOrigin(window.location.origin), []);

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
        <CardTitle>Tiền điện</CardTitle>
        <span className="ml-auto text-sm font-semibold text-muted">
          {monthLabel(month.year, month.month)}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* SEND-TO-MANAGER — the primary action: big, obvious, one-tap copy */}
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <span className="text-base font-bold">Gửi cho quản lý ghi số điện</span>
          </div>
          <p className="text-sm text-muted">
            Gửi đường link và mật khẩu bên dưới cho quản lý để họ nhập số điện mỗi tháng.
          </p>
          <div className="flex flex-col gap-1.5 rounded-xl bg-surface p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Đường link</span>
              <a
                href={origin ? `${origin}/dien` : "/dien"}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-semibold text-primary hover:underline"
              >
                {origin}/dien
              </a>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-1.5">
              <span className="text-muted">Mật khẩu</span>
              <span className="text-base font-extrabold tracking-wide text-primary">mh71</span>
            </div>
          </div>
          <Button size="lg" onClick={copyMeterLink} className="h-14 w-full sm:h-13">
            <Copy className="h-5 w-5" />
            Copy link + mật khẩu
          </Button>
        </div>

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

        {/* EVN bill — the owner's actual electricity cost (manual, for profit) */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="evn-bill">Tiền điện EVN phải trả (đ)</Label>
          <Input
            id="evn-bill"
            inputMode="numeric"
            disabled={locked}
            value={evn ? formatNumber(evn) : ""}
            onChange={(e) => setEvn(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
            onBlur={() => {
              if (!locked && evn !== month.evn_bill) saveEvn.mutate();
            }}
            placeholder="0"
          />
          <p className="text-sm text-muted">
            {locked
              ? "Tháng này đã khoá — không thể sửa."
              : "Hoá đơn điện thực tế trả cho EVN (khác với tiền điện thu của khách). Dùng để tính lợi nhuận."}
          </p>
        </div>

        {/* email notification when the manager fills số điện (universal setting) */}
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <Label htmlFor="notify-email" className="flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-muted" />
            Email nhận thông báo
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="notify-email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveNotifyEmail();
                }
              }}
              placeholder="ban@email.com"
            />
            <Button
              onClick={saveNotifyEmail}
              disabled={!notifyChanged || saveNotify.isPending}
              className="shrink-0"
            >
              {saveNotify.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              Lưu
            </Button>
          </div>
          <p className="text-sm text-muted">
            Gửi email cho bạn mỗi khi quản lý ghi xong (hoặc cập nhật lại) số điện. Để trống nếu
            không muốn nhận thông báo.
          </p>
        </div>

      </CardContent>
    </Card>
  );
}

/* -------------------------- QR Code settings -------------------------- */
function QrCodeSettingsCard({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const settings = useSettings().data;
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [originalFile, setOriginalFile] = React.useState<File | null>(null);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [initialOffset, setInitialOffset] = React.useState({ x: 0, y: 0 });
  const [scale, setScale] = React.useState(1.0);
  const [saving, setSaving] = React.useState(false);

  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const imageElRef = React.useRef<HTMLImageElement | null>(null);

  const onStart = (clientX: number, clientY: number) => {
    setDragStart({ x: clientX, y: clientY });
    setInitialOffset({ x: offset.x, y: offset.y });
  };

  const onMove = (clientX: number, clientY: number) => {
    if (!dragStart) return;
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    setOffset({
      x: initialOffset.x + dx,
      y: initialOffset.y + dy,
    });
  };

  const onEnd = () => {
    setDragStart(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOriginalFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setOffset({ x: 0, y: 0 });
      setScale(1.0);
    };
    reader.readAsDataURL(file);
  };

  const saveQr = async () => {
    if (!imageElRef.current || !frameRef.current || !imageSrc || !originalFile) return;
    setSaving(true);
    try {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          toast.error("Không thể tạo canvas.");
          setSaving(false);
          return;
        }

        const frameRect = frameRef.current!.getBoundingClientRect();
        const imgRect = imageElRef.current!.getBoundingClientRect();

        const xPct = (frameRect.left - imgRect.left) / imgRect.width;
        const yPct = (frameRect.top - imgRect.top) / imgRect.height;
        const wPct = frameRect.width / imgRect.width;
        const hPct = frameRect.height / imgRect.height;

        const sX = img.naturalWidth * xPct;
        const sY = img.naturalHeight * yPct;
        const sW = img.naturalWidth * wPct;
        const sH = img.naturalHeight * hPct;

        canvas.width = sW;
        canvas.height = sH;

        // Fill background with white (same as receipt card) in case crop window goes outside image bounds
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sW, sH);

        ctx.drawImage(img, sX, sY, sW, sH, 0, 0, sW, sH);

        canvas.toBlob(async (blob) => {
          if (!blob) {
            toast.error("Không thể nén ảnh.");
            setSaving(false);
            return;
          }
          try {
            const fileToUpload = new File([blob], "qr_code.webp", { type: "image/webp" });
            const url = await uploadImage("tenant-photos", fileToUpload, "qr_", true);
            await updateSettings({ qr_code_url: url });
            qc.invalidateQueries({ queryKey: qk.settings });
            toast.success("Đã lưu QR Code chủ tài khoản");
            setImageSrc(null);
            setOriginalFile(null);
            setOffset({ x: 0, y: 0 });
            setScale(1.0);
          } catch (e: any) {
            toast.error(`Lỗi tải lên: ${e.message}`);
          } finally {
            setSaving(false);
          }
        }, "image/webp", 0.7);
      };
    } catch (e: any) {
      toast.error(`Lỗi: ${e.message}`);
      setSaving(false);
    }
  };

  const deleteQr = async () => {
    if (!settings?.qr_code_url) return;
    if (!confirm("Xác nhận xoá QR Code chủ tài khoản?")) return;
    try {
      await deleteImage("tenant-photos", settings.qr_code_url);
      await updateSettings({ qr_code_url: null });
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Đã xoá QR Code");
    } catch (e: any) {
      toast.error(`Lỗi: ${e.message}`);
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <CardTitle>Hình QR chủ tài khoản</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Mã QR Thanh Toán</span>
          <p className="text-sm text-muted">
            Tải lên ảnh QR chuyển khoản để hiển thị trên Thẻ thanh toán của khách thuê.
          </p>
        </div>

        {/* Warning notification banner */}
        <div className="flex gap-2.5 rounded-xl bg-warning-surface p-3 text-warning border border-warning/15">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-xs leading-normal">
            <span className="font-bold">Lưu ý bảo mật:</span> Bạn nên cắt ảnh để ẩn các thông tin nhạy cảm khác (như số dư, nút chức năng ngân hàng, v.v.), chỉ để lại mã QR và thông tin số tài khoản.
          </div>
        </div>

        {settings?.qr_code_url && !imageSrc && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="text-xs font-semibold text-muted">Mã QR hiện tại:</div>
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.qr_code_url}
                alt="QR Code chủ tài khoản"
                className="max-h-48 rounded-lg border border-border object-contain shadow-sm bg-white"
              />
              <Button variant="outline" size="sm" className="text-danger" onClick={deleteQr}>
                <Trash2 className="h-4 w-4" />
                Xoá QR Code
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Label htmlFor="qr-file-input" className="cursor-pointer">
            <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2 transition-colors">
              <Camera className="h-4 w-4" />
              {settings?.qr_code_url ? "Thay đổi ảnh QR Code" : "Tải lên ảnh QR Code"}
            </span>
          </Label>
          <input
            id="qr-file-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {imageSrc && (
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-muted uppercase">CẮT ẢNH: Kéo ảnh để căn chỉnh và dùng thanh trượt để zoom</span>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Workspace Container */}
              <div
                className="relative w-full aspect-square max-w-[320px] overflow-hidden bg-zinc-950 rounded-xl cursor-move touch-none flex justify-center items-center select-none border border-border"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onStart(e.clientX, e.clientY);
                }}
                onMouseMove={(e) => {
                  if (dragStart) {
                    e.preventDefault();
                    onMove(e.clientX, e.clientY);
                  }
                }}
                onMouseUp={onEnd}
                onMouseLeave={onEnd}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  if (touch) onStart(touch.clientX, touch.clientY);
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  if (touch) onMove(touch.clientX, touch.clientY);
                }}
                onTouchEnd={onEnd}
              >
                {/* Image behind the frame */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageElRef}
                  src={imageSrc}
                  alt="Original to crop"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transformOrigin: "center center",
                    transition: dragStart ? "none" : "transform 0.15s ease-out",
                  }}
                  className="max-w-[85%] max-h-[85%] object-contain select-none pointer-events-none"
                />

                {/* Fixed Crop Frame Overlay */}
                <div
                  ref={frameRef}
                  className="absolute pointer-events-none z-10 w-[240px] h-[240px] border-2 border-white border-solid rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                />
              </div>

              {/* Sliders and Actions */}
              <div className="flex-1 w-full space-y-4">
                <style dangerouslySetInnerHTML={{__html: `
                  .custom-zoom-slider {
                    -webkit-appearance: none;
                    width: 100%;
                    height: 20px;
                    background: transparent;
                    cursor: pointer;
                  }
                  .custom-zoom-slider:focus {
                    outline: none;
                  }
                  .custom-zoom-slider::-webkit-slider-runnable-track {
                    width: 100%;
                    height: 6px;
                    background: #d4d4d8; /* zinc-300 for clear contrast */
                    border-radius: 9999px;
                  }
                  .dark .custom-zoom-slider::-webkit-slider-runnable-track {
                    background: #52525b; /* zinc-600 */
                  }
                  .custom-zoom-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 18px;
                    width: 18px;
                    border-radius: 9999px;
                    background: var(--color-primary, #0e8aa3);
                    border: 2px solid #ffffff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.18);
                    margin-top: -6px;
                  }
                  .dark .custom-zoom-slider::-webkit-slider-thumb {
                    border-color: #1b2a4a; /* surface dark */
                  }
                  .custom-zoom-slider::-moz-range-track {
                    width: 100%;
                    height: 6px;
                    background: #d4d4d8;
                    border-radius: 9999px;
                  }
                  .dark .custom-zoom-slider::-moz-range-track {
                    background: #52525b;
                  }
                  .custom-zoom-slider::-moz-range-thumb {
                    height: 18px;
                    width: 18px;
                    border-radius: 9999px;
                    background: var(--color-primary, #0e8aa3);
                    border: 2px solid #ffffff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.18);
                  }
                  .dark .custom-zoom-slider::-moz-range-thumb {
                    border-color: #1b2a4a;
                  }
                `}} />
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Phóng to / Thu nhỏ (Zoom):</span>
                    <span>{scale.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="custom-zoom-slider my-2"
                  />
                </div>

                <div className="flex gap-2">
                  <Button disabled={saving} onClick={saveQr} className="flex-1 py-3 text-sm font-bold">
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                    Cắt &amp; Lưu QR Code
                  </Button>
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      setImageSrc(null);
                      setOriginalFile(null);
                      setOffset({ x: 0, y: 0 });
                      setScale(1.0);
                    }}
                    className="px-4 py-3 text-sm font-semibold"
                  >
                    Huỷ
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
