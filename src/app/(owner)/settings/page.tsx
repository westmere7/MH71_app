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
  Mail,
  Send,
  Archive,
  Download,
  ChevronDown,
} from "lucide-react";
import { useMonthCtx } from "@/components/month-provider";
import { qk, useBills, useSettings, useRooms, useBackups } from "@/lib/queries";
import {
  createNextMonth,
  deleteMonth,
  updateSettings,
  updateMonthMeta,
  createBackup,
  deleteBackup,
} from "@/lib/mutations";
import { downloadBackupCsv } from "@/lib/backup-csv";
import { uploadImage, deleteImage } from "@/lib/upload";
import {
  VIETNAM_BANKS,
  generateVietQRUrl,
  DEFAULT_BANK_ID,
  DEFAULT_BANK_ACCOUNT_NO,
  DEFAULT_BANK_ACCOUNT_NAME,
  DEFAULT_VIETQR_TEMPLATE,
} from "@/lib/vietqr";
import { UI_SCALES, UI_SCALE_KEY, UI_SCALE_DEFAULT, applyUiScale } from "@/lib/ui-scale";
import { computeMonthStats } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { PricingCard } from "@/components/settings/pricing-card";
import { AuditLogCard } from "@/components/settings/audit-log-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { monthLabel, formatNumber, formatDateTime, formatVND } from "@/lib/format";
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
      <AuditLogCard />
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
          Tạo kỳ tiếp theo: áp dụng bảng giá hiện tại và giữ nguyên danh sách người thuê phòng.
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

        {month && <BackupSection qc={qc} month={month} />}

        {month && (
          <div className="mt-1 flex flex-col gap-2 border-t border-border pt-4">
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

/* ------------------------- backups (snapshots) ---------------------- */
function BackupSection({
  qc,
  month,
}: {
  qc: ReturnType<typeof useQueryClient>;
  month: MonthRow;
}) {
  const bills = useBills(month.id).data ?? [];
  const rooms = useRooms().data ?? [];
  const backups = useBackups(month.id).data ?? [];
  const stats = computeMonthStats(bills, month);
  const canBackup = stats.meterFilled; // only after số điện has been submitted

  const create = useMutation({
    mutationFn: () => createBackup(month, bills, rooms),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.backups(month.id) });
      toast.success("Đã tạo bản sao lưu");
    },
    onError: () => toast.error("Không tạo được bản sao lưu. Cần chạy migration 0018."),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteBackup(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.backups(month.id) });
      toast.success("Đã xoá bản sao lưu");
    },
    onError: () => toast.error("Không xoá được."),
  });

  const [open, setOpen] = React.useState(false);

  return (
    <div className="mt-1 border-t border-border pt-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 text-left text-sm font-semibold"
        >
          <Archive className="h-4 w-4 shrink-0 text-primary" />
          Sao lưu {monthLabel(month.year, month.month)}
          <ChevronDown
            className={cn(
              "ml-auto h-5 w-5 shrink-0 text-muted transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        <CollapsibleContent>
          <div className="flex flex-col gap-3 pt-3">
            <p className="text-sm text-muted">
              Đóng băng toàn bộ số liệu hiện tại thành một bản lưu kèm thời gian. Có thể tải từng
              bản về file CSV.
            </p>

            <Button
              variant="outline"
              onClick={() => create.mutate()}
              disabled={!canBackup || create.isPending}
              className="self-start"
            >
              {create.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Archive className="h-5 w-5" />
              )}
              Tạo bản sao lưu
            </Button>
            {!canBackup && (
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Cần ghi xong số điện trước khi sao lưu.
              </p>
            )}

            {backups.length > 0 && (
              <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                {backups.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold">{formatDateTime(b.created_at)}</div>
                      <div className="text-xs text-muted">
                        {formatNumber(b.units_total)} số • {formatVND(b.total_billed)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => downloadBackupCsv(b)}>
                        <Download className="h-4 w-4" />
                        CSV
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Xoá bản sao lưu này?")) del.mutate(b.id);
                        }}
                        aria-label="Xoá bản sao lưu"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger-surface hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
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
    <CollapsibleCard title="Khoá tháng đã qua" icon={Lock}>
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
    </CollapsibleCard>
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
    <CollapsibleCard title="Hiển thị" icon={ALargeSmall} contentClassName="flex flex-col gap-4">
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
    </CollapsibleCard>
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
    onError: () => toast.error("Lưu không thành công. Cần chạy migration 0017."),
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <CurrencyInput
              id="evn-bill"
              disabled={locked}
              value={evn}
              onChange={setEvn}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !locked && evn !== month.evn_bill) saveEvn.mutate();
              }}
              placeholder="0"
            />
            <Button
              onClick={() => saveEvn.mutate()}
              disabled={locked || evn === month.evn_bill || saveEvn.isPending}
              className="shrink-0"
            >
              {saveEvn.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              Lưu
            </Button>
          </div>
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

/* -------------------------- VietQR Bank Settings -------------------------- */
function QrCodeSettingsCard({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const settings = useSettings().data;

  const [bankId, setBankId] = React.useState(DEFAULT_BANK_ID);
  const [accountNo, setAccountNo] = React.useState(DEFAULT_BANK_ACCOUNT_NO);
  const [accountName, setAccountName] = React.useState(DEFAULT_BANK_ACCOUNT_NAME);
  const [template, setTemplate] = React.useState(DEFAULT_VIETQR_TEMPLATE);

  React.useEffect(() => {
    if (settings) {
      setBankId(settings.bank_id || DEFAULT_BANK_ID);
      setAccountNo(settings.bank_account_no || DEFAULT_BANK_ACCOUNT_NO);
      setAccountName(settings.bank_account_name || DEFAULT_BANK_ACCOUNT_NAME);
      setTemplate(settings.vietqr_template || DEFAULT_VIETQR_TEMPLATE);
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () =>
      updateSettings({
        bank_id: bankId.trim(),
        bank_account_no: accountNo.trim(),
        bank_account_name: accountName.trim().toUpperCase(),
        vietqr_template: template,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Đã lưu cấu hình VietQR");
    },
    onError: () => toast.error("Lưu không thành công."),
  });

  const previewUrl = generateVietQRUrl({
    bankId,
    accountNo,
    accountName,
    template,
    amount: 1400000,
    addInfo: "MH71 P15 T10",
  });

  return (
    <CollapsibleCard title="Mã QR VietQR chuyển khoản" icon={Zap} contentClassName="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Cấu hình VietQR tự động</span>
        <p className="text-sm text-muted">
          Nhập thông tin tài khoản ngân hàng để tự động tạo mã QR chuyển khoản chuẩn VietQR trên Thẻ thanh toán của từng phòng.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="bank-select">Ngân hàng</Label>
          <select
            id="bank-select"
            value={bankId}
            onChange={(e) => setBankId(e.target.value)}
            className="h-11 w-full rounded-xl border-2 border-input bg-surface px-3 text-base text-foreground focus-visible:border-primary focus-visible:outline-none"
          >
            {VIETNAM_BANKS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.shortName} — {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="acc-no">Số tài khoản</Label>
          <Input
            id="acc-no"
            value={accountNo}
            onChange={(e) => setAccountNo(e.target.value)}
            placeholder="3130907350"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="acc-name">Tên chủ tài khoản (viết hoa không dấu)</Label>
          <Input
            id="acc-name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="NGUYEN BAC KINH"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="template-select">Kiểu hiển thị QR</Label>
          <select
            id="template-select"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="h-11 w-full rounded-xl border-2 border-input bg-surface px-3 text-base text-foreground focus-visible:border-primary focus-visible:outline-none"
          >
            <option value="compact2">Compact 2 (Kèm logo &amp; thông tin TK)</option>
            <option value="compact">Compact (Kèm logo nhỏ)</option>
            <option value="qr_only">Chỉ mã QR (QR Only)</option>
            <option value="print">In ấn (Print style)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <span className="text-xs font-bold text-muted uppercase">Xem trước VietQR mẫu (kèm tiền &amp; nội dung):</span>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="VietQR preview"
            className="h-56 w-56 rounded-lg border border-border object-contain bg-white shadow-sm"
          />
          <div className="flex flex-col gap-1 text-sm text-muted">
            <div><span className="font-semibold text-foreground">Ngân hàng:</span> {VIETNAM_BANKS.find(b => b.id === bankId)?.name || bankId}</div>
            <div><span className="font-semibold text-foreground">Số tài khoản:</span> {accountNo}</div>
            <div><span className="font-semibold text-foreground">Chủ tài khoản:</span> {accountName.toUpperCase()}</div>
            <div><span className="font-semibold text-foreground">Ví dụ thẻ thanh toán:</span> 1.400.000 ₫ (Nội dung: MH71 P15 T10)</div>
          </div>
        </div>
      </div>

      <Button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="self-start"
      >
        {save.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
        Lưu cấu hình VietQR
      </Button>
    </CollapsibleCard>
  );
}
