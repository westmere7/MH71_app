"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { Download, Loader2, Copy, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PaymentCardView } from "./payment-card-view";
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
  const [isMobile, setIsMobile] = React.useState(false);
  const settings = useSettings().data;

  React.useEffect(() => setIsMobile(isMobileDevice()), []);

  const filename = `MH71_${room.code}_T${month.month}_${month.year}.png`;

  async function renderPng() {
    const dataUrl = await toPng(cardRef.current!, { pixelRatio: 2, cacheBust: true });
    const blob = await (await fetch(dataUrl)).blob();
    return { dataUrl, blob };
  }

  function downloadDataUrl(dataUrl: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  async function download() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const { dataUrl } = await renderPng();
      downloadDataUrl(dataUrl);
      toast.success("Đã tải thẻ thanh toán");
    } catch {
      toast.error("Không tạo được ảnh, thử lại.");
    } finally {
      setBusy(false);
    }
  }

  // DESKTOP: copy the card image to the clipboard → paste into Zalo
  async function copyImage() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const { dataUrl, blob } = await renderPng();
      const canCopy =
        typeof window !== "undefined" && "ClipboardItem" in window && !!navigator.clipboard?.write;
      if (canCopy) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ [blob.type]: blob }),
        ]);
        toast.success("Đã sao chép ảnh. Mở Zalo rồi dán (Ctrl/Cmd + V) để gửi.");
      } else {
        downloadDataUrl(dataUrl);
        toast.info("Trình duyệt không hỗ trợ sao chép ảnh. Đã tải ảnh xuống.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Không sao chép được ảnh, thử lại.");
    } finally {
      setBusy(false);
    }
  }

  // MOBILE: open the native share sheet (Zalo shows up) — works on Android & iOS
  async function shareImage() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const { dataUrl, blob } = await renderPng();
      const file = new File([blob], filename, { type: "image/png" });

      // 1) Native share sheet (Zalo appears). Attempt whenever share() exists —
      //    some Android browsers (e.g. Edge) support it but report canShare false.
      if (typeof navigator !== "undefined" && navigator.share) {
        const okFiles = !navigator.canShare || navigator.canShare({ files: [file] });
        if (okFiles) {
          try {
            await navigator.share({ files: [file], title: `Thẻ thanh toán — ${room.code}` });
            return;
          } catch (e) {
            if ((e as { name?: string })?.name === "AbortError") return; // user cancelled
            // otherwise fall through to the fallbacks below
          }
        }
      }

      // 2) Copy image to clipboard (works on Edge/Chrome Android) → paste into Zalo
      if (typeof window !== "undefined" && "ClipboardItem" in window && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ [blob.type]: blob }),
          ]);
          toast.success("Đã sao chép ảnh. Mở Zalo rồi dán để gửi.");
          return;
        } catch {
          /* fall through to download */
        }
      }

      // 3) Last resort: download
      downloadDataUrl(dataUrl);
      toast.info("Đã tải ảnh xuống — mở Zalo rồi đính kèm ảnh để gửi.");
    } catch (e) {
      console.error(e);
      toast.error("Không chia sẻ được, thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thẻ thanh toán — {room.code}</DialogTitle>
        </DialogHeader>

        <PaymentCardView
          ref={cardRef}
          bill={bill}
          room={room}
          month={month}
          tenantName={tenantName ?? null}
          buildingName={buildingName}
          qrUrl={settings?.qr_code_url}
        />

        <div className="flex gap-2.5">
          <Button
            onClick={isMobile ? shareImage : copyImage}
            disabled={busy}
            size="lg"
            className="flex-1"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin mr-1.5" />
            ) : isMobile ? (
              <Share2 className="h-5 w-5 mr-1.5" />
            ) : (
              <Copy className="h-5 w-5 mr-1.5" />
            )}
            {isMobile ? "Chia sẻ" : "Sao chép ảnh"}
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

/** Phone/tablet → use the native share sheet; desktop → copy to clipboard. */
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPod|iPad/i.test(ua)) return true;
  // iPadOS 13+ reports as "Macintosh" — detect it via touch support
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  // generic touch-first fallback
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(pointer: coarse)").matches &&
    navigator.maxTouchPoints > 0
  );
}
