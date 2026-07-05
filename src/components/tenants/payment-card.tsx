"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { Download, Loader2, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatVND, formatNumber, monthLabel, periodLabel } from "@/lib/format";
import type { Bill, MonthRow, Room } from "@/lib/supabase/types";
import { toast } from "sonner";
import { useSettings } from "@/lib/queries";

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
  const settings = useSettings().data;

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

  async function share() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const filename = `MH71_${room.code}_T${month.month}_${month.year}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Thẻ thanh toán — ${room.code}`,
          text: `Phiếu báo tiền phòng ${room.code} tháng ${month.month}/${month.year}`,
        });
        toast.success("Đã mở bảng chia sẻ thành công");
      } else {
        // Fallback: Copy to clipboard!
        if (typeof window !== "undefined" && (window as any).ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new (window as any).ClipboardItem({
                [blob.type]: blob,
              }),
            ]);
            toast.success("Đã sao chép ảnh vào bộ nhớ tạm. Hãy mở Zalo và nhấn Ctrl+V (Cmd+V) để dán gửi!");
            return;
          } catch (clipErr) {
            console.error("Clipboard copy failed, falling back to download:", clipErr);
          }
        }
        // Fallback 2: download
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        a.click();
        toast.info("Trình duyệt không hỗ trợ chia sẻ. Đã tự động tải ảnh.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Không thể thực hiện chia sẻ.");
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
          className="overflow-hidden rounded-2xl border border-[#e3e7f1] bg-white text-[#16203c]"
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
              <span className="text-[14px] font-medium text-[#5a647e]">
                Khách thuê: {tenantName ?? "—"}
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

            {settings?.qr_code_url && (
              <div className="mt-4 border-t border-dashed border-[#dfe3ee] pt-3 flex flex-col items-center">
                <span className="text-[13px] font-semibold text-[#5a647e] mb-2">MÃ QR QUÉT THANH TOÁN</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={settings.qr_code_url}
                  crossOrigin="anonymous"
                  alt="QR Code thanh toán"
                  className="w-[280px] h-[280px] object-contain rounded-lg border border-[#e3e7f1] shadow-sm bg-white"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2.5">
          <Button onClick={share} disabled={busy} size="lg" className="flex-1">
            {busy ? <Loader2 className="h-5 w-5 animate-spin mr-1.5" /> : <Send className="h-5 w-5 mr-1.5" />}
            Chia sẻ
          </Button>
          <Button onClick={download} disabled={busy} size="lg" variant="outline" className="flex-1">
            {busy ? <Loader2 className="h-5 w-5 animate-spin mr-1.5" /> : <Download className="h-5 w-5 mr-1.5" />}
            Tải ảnh
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
