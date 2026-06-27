"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Save,
  Building2,
  CalendarPlus,
  Coins,
  ChevronRight,
  Trash2,
  Zap,
  Camera,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useMonthCtx } from "@/components/month-provider";
import { qk, useBills } from "@/lib/queries";
import { updateSettings, updateMonthMeta, createNextMonth, deleteMonth } from "@/lib/mutations";
import { computeMonthStats } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignOutButton } from "@/components/layout/sign-out-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { monthLabel, formatNumber, formatDateTime } from "@/lib/format";
import type { MonthRow } from "@/lib/supabase/types";
import { toast } from "sonner";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { settings, selectedMonth, setSelectedMonthId } = useMonthCtx();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold tracking-tight">Cài đặt</h1>

      <AddRemoveMonthCard
        qc={qc}
        month={selectedMonth}
        onCreated={(m) => {
          qc.invalidateQueries({ queryKey: qk.months });
          qc.invalidateQueries({ queryKey: ["bills"] });
          setSelectedMonthId(m.id);
        }}
      />

      <GeneralSettings key={settings?.updated_at} qc={qc} settings={settings} />

      <Link href="/gia">
        <Card className="transition-colors hover:bg-surface-2">
          <CardContent className="flex items-center gap-3 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Coins className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <div className="font-bold">Thiết lập giá</div>
              <div className="text-sm text-muted">Tiền phòng, tiền rác, đơn giá điện theo từng phòng</div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted" />
          </CardContent>
        </Card>
      </Link>

      {selectedMonth && <MeterExpenseCard key={selectedMonth.id} qc={qc} month={selectedMonth} />}

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

/* ------------------------- add / remove month ------------------------- */
function AddRemoveMonthCard({
  qc,
  month,
  onCreated,
}: {
  qc: ReturnType<typeof useQueryClient>;
  month: MonthRow | null;
  onCreated: (m: MonthRow) => void;
}) {
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
      <CardHeader className="flex-row items-center gap-2">
        <CalendarPlus className="h-5 w-5 text-primary" />
        <CardTitle>Thêm / xoá tháng</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted">
          Tạo kỳ tiếp theo: tự động chuyển số điện cuối kỳ thành số đầu kỳ mới, áp dụng bảng giá
          hiện tại và giữ nguyên khách thuê. Quản lý sẽ nhập số điện mới ở trang ghi điện.
        </p>
        <Button
          onClick={() => {
            if (confirm("Tạo tháng mới và sinh hoá đơn cho tất cả các phòng?")) create.mutate();
          }}
          disabled={create.isPending}
        >
          {create.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          Tạo tháng mới
        </Button>

        {month && (
          <div className="mt-1 flex flex-col gap-2 border-t border-border pt-4">
            <span className="text-sm font-semibold text-muted">Khu vực nguy hiểm</span>
            <DeleteMonthButton qc={qc} month={month} />
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
        Xoá tháng này — {monthLabel(month.year, month.month)}
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

/* ----------------------------- general ----------------------------- */
function GeneralSettings({
  qc,
  settings,
}: {
  qc: ReturnType<typeof useQueryClient>;
  settings: ReturnType<typeof useMonthCtx>["settings"];
}) {
  const [name, setName] = React.useState(settings?.building_name ?? "MH71");
  const [target, setTarget] = React.useState(settings?.collection_target_pct ?? 88);

  const save = useMutation({
    mutationFn: () => updateSettings({ building_name: name, collection_target_pct: target }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Đã lưu cài đặt chung");
    },
    onError: () => toast.error("Lưu thất bại."),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <CardTitle>Cài đặt chung</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên nhà trọ">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Mục tiêu thu (%)">
          <Input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
        </Field>
        <div className="sm:col-span-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Lưu cài đặt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------- electricity & other costs --------------------- */
function MeterExpenseCard({
  qc,
  month,
}: {
  qc: ReturnType<typeof useQueryClient>;
  month: MonthRow;
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
      toast.success("Đã lưu tổng chi");
    },
    onError: () => toast.error("Lưu thất bại."),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <CardTitle>Tiền điện & chi phí khác — {monthLabel(month.year, month.month)}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* meter status */}
        <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">Số điện tháng này</span>
            {loading ? (
              <span className="text-sm text-muted">Đang tải…</span>
            ) : filled ? (
              <span className="text-lg font-extrabold">{formatNumber(stats.unitsTotal)} số</span>
            ) : (
              <span className="rounded-full bg-warning-surface px-2.5 py-1 text-sm font-semibold text-warning">
                Chưa ghi số điện
              </span>
            )}
          </div>
          {!loading && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {filled ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="font-medium text-success">Quản lý đã ghi xong</span>
                  {month.meter_filled_at && (
                    <span className="flex items-center gap-1 text-muted">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDateTime(month.meter_filled_at)}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <span className="font-medium text-warning">Quản lý chưa ghi số điện tháng này</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* note photo */}
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Camera className="h-4 w-4 text-muted" /> Ảnh giấy ghi số điện
          </span>
          {month.meter_note_photo_url ? (
            <a href={month.meter_note_photo_url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={month.meter_note_photo_url}
                alt="Ảnh ghi số điện"
                className="max-h-48 rounded-xl border border-border object-contain"
              />
            </a>
          ) : (
            <p className="text-sm text-muted">Quản lý chưa tải ảnh.</p>
          )}
        </div>

        {/* link to meter page */}
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-4">
          <span className="text-sm font-semibold">Trang ghi điện cho quản lý</span>
          <p className="text-sm text-muted">
            Gửi đường link này cho người quản lý tại chỗ để nhập số điện. Mật khẩu trang:{" "}
            <span className="font-bold text-foreground">mh71</span>
          </p>
          <a href="/dien" target="_blank" rel="noopener noreferrer" className="self-start">
            <Button variant="outline">
              <ExternalLink className="h-5 w-5" />
              Mở trang ghi điện
            </Button>
          </a>
        </div>

        {/* total expenses */}
        <Field label="Tổng chi tháng (đ) — EVN, rác, internet… (Lợi nhuận = Tổng thu − Tổng chi)">
          <div className="flex gap-2">
            <Input
              type="number"
              value={otherFees}
              onChange={(e) => setOtherFees(Number(e.target.value))}
            />
            <Button variant="outline" onClick={() => saveFees.mutate()} disabled={saveFees.isPending}>
              {saveFees.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Lưu"}
            </Button>
          </div>
        </Field>
        <p className="-mt-2 text-sm text-muted">
          “Thu tiền” tự động cập nhật theo số phòng đã thanh toán — không cần chỉnh tay.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ helpers ----------------------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
