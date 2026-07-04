"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { Download, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatVND, formatNumber, monthLabel, periodLabel } from "@/lib/format";
import type { Bill, MonthRow, Room } from "@/lib/supabase/types";
import { toast } from "sonner";

export function PaymentCardDialog({
  open,
  onOpenChange,
  bill,
  room,
  month,
  tenantName,
  buildingName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bill: Bill;
  room: Room;
  month: MonthRow;
  tenantName: string | null;
  buildingName: string;
}) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [busy, setBusy] = React.useState(false);

  async function download() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `MH71_${room.code}_T${month.month}_${month.year}.png`;
      a.click();
      toast.success("Đã tải thẻ thanh toán");
    } catch {
      toast.error("Không tạo được ảnh, thử lại.");
    } finally {
      setBusy(false);
    }
  }

  const row = (label: string, value: string, hint?: string) => (
    <div className="flex items-center justify-between border-b border-dashed border-[#dfe3ee] py-2 last:border-0">
      <span className="text-[15px]" style={{ color: "#5a647e" }}>
        {label}
        {hint && <span className="ml-1 text-[13px] text-[#9aa3b8]">({hint})</span>}
      </span>
      <span className="text-[15px] font-semibold text-[#16203c]">{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thẻ thanh toán — {room.code}</DialogTitle>
        </DialogHeader>

        {/* exported card */}
        <div
          ref={cardRef}
          style={{ fontFamily: "var(--font-be-vietnam), sans-serif" }}
          className="overflow-hidden rounded-2xl border border-[#e3e7f1] bg-white"
        >
          <div className="bg-[#1b2a4a] px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <span className="text-lg font-extrabold">{buildingName}</span>
              <span className="rounded-lg bg-[#14b6d6] px-2.5 py-1 text-sm font-bold">
                {room.code}
              </span>
            </div>
            <div className="mt-1 text-sm text-[#b9c4dd]">
              Phiếu báo tiền {monthLabel(month.year, month.month)}
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[15px] font-bold text-[#16203c]">
                {tenantName ?? "—"}
              </span>
              <span className="text-[13px] text-[#9aa3b8]">
                {periodLabel(month.period_start, month.period_end)}
              </span>
            </div>

            {row(
              "Tiền điện",
              formatVND(bill.electricity_amount),
              `${formatNumber(bill.units)} số × ${formatNumber(bill.electricity_rate)}`,
            )}
            {row("Tiền phòng", formatVND(bill.room_fee))}
            {row("Tiền rác", formatVND(bill.trash_fee))}

            <div className="mt-3 flex items-center justify-between rounded-xl bg-[#eef7fb] px-4 py-3">
              <span className="text-[15px] font-bold text-[#16203c]">TỔNG CỘNG</span>
              <span className="text-xl font-extrabold text-[#0e8aa3]">
                {formatVND(bill.total)}
              </span>
            </div>

            <p className="mt-3 text-center text-[12px] text-[#9aa3b8]">
              Vui lòng thanh toán đúng hạn. Cảm ơn quý khách!
            </p>
          </div>
        </div>

        <Button onClick={download} disabled={busy} size="lg" className="w-full">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          Tải ảnh
        </Button>
      </DialogContent>
    </Dialog>
  );
}
