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
} from "lucide-react";
import { useMonthCtx } from "@/components/month-provider";
import { qk, useBills } from "@/lib/queries";
import { updateMonthMeta, createNextMonth, deleteMonth } from "@/lib/mutations";
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
  const { selectedMonth, setSelectedMonthId } = useMonthCtx();

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
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4">
          <span className="text-sm font-semibold">Trang ghi điện cho quản lý</span>
          <p className="text-sm text-muted">
            Gửi đường link này cho người quản lý tại chỗ để nhập số điện. Mật khẩu trang:{" "}
            <span className="font-bold text-foreground">mh71</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/dien" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <ExternalLink className="h-5 w-5" />
                Mở trang ghi điện
              </Button>
            </a>
            <Button variant="outline" onClick={copyMeterLink}>
              <Copy className="h-5 w-5" />
              Copy
            </Button>
          </div>
        </div>

        {/* other expenses — single VND box, saved on blur */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="other-fees">Chi phí khác trong tháng (đ)</Label>
          <Input
            id="other-fees"
            inputMode="numeric"
            value={otherFees ? formatNumber(otherFees) : ""}
            onChange={(e) => setOtherFees(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
            onBlur={() => {
              if (otherFees !== month.other_fees) saveFees.mutate();
            }}
            placeholder="0"
          />
          <p className="text-sm text-muted">
            EVN, rác, internet… — Lợi nhuận = Tổng thu − Chi phí khác. “Thu tiền” tự động theo số
            phòng đã thanh toán.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
