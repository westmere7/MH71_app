"use client";

import * as React from "react";
import JSZip from "jszip";
import { toPng } from "html-to-image";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMonthCtx } from "@/components/month-provider";
import { useBills, useRooms } from "@/lib/queries";
import { computeMonthStats } from "@/lib/finance";
import { PaymentCardView } from "./payment-card-view";
import { toast } from "sonner";
import type { Bill, Room } from "@/lib/supabase/types";

function waitForImages(el: HTMLElement): Promise<void> {
  const imgs = Array.from(el.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.addEventListener("load", () => res(), { once: true });
            img.addEventListener("error", () => res(), { once: true });
          }),
    ),
  ).then(() => undefined);
}

/** Desktop-only: download every room's payment card as a single ZIP.
 *  Enabled only after số điện has been registered for the month. */
export function BulkPaymentCards() {
  const { selectedMonth, settings } = useMonthCtx();
  const bills = useBills(selectedMonth?.id ?? null).data ?? [];
  const rooms = useRooms().data ?? [];
  const [busy, setBusy] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const ready = !!(selectedMonth && computeMonthStats(bills, selectedMonth).meterFilled);

  const roomById = React.useMemo(() => {
    const m = new Map<string, Room>();
    for (const r of rooms as Room[]) m.set(r.id, r);
    return m;
  }, [rooms]);

  const cards = React.useMemo(
    () =>
      (bills as Bill[])
        .filter((b) => b.payment_status !== "vacant" && roomById.has(b.room_id))
        .map((b) => ({ bill: b, room: roomById.get(b.room_id)! }))
        .sort((a, b) => a.room.sort_order - b.room.sort_order),
    [bills, roomById],
  );

  async function downloadZip() {
    if (!selectedMonth || busy) return;
    if (cards.length === 0) {
      toast.error("Không có thẻ để tải.");
      return;
    }
    setBusy(true);
    setExporting(true);
    try {
      // let the hidden cards mount + their QR images load before capturing
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      const container = containerRef.current;
      if (!container) throw new Error("render surface missing");
      await waitForImages(container);

      const folder = `Thang ${selectedMonth.month}.${selectedMonth.year}`;
      const zip = new JSZip();
      const nodes = Array.from(container.querySelectorAll<HTMLElement>("[data-card]"));
      for (const node of nodes) {
        const code = node.getAttribute("data-card") || "phong";
        const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
        zip.file(`${folder}/${code}.png`, dataUrl.split(",")[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folder}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Đã tải ${nodes.length} thẻ thanh toán`);
    } catch (e) {
      console.error(e);
      toast.error("Không tạo được file zip, thử lại.");
    } finally {
      setExporting(false);
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size="lg"
        onClick={downloadZip}
        disabled={!ready || busy}
        title={ready ? undefined : "Cần ghi xong số điện trước"}
        className="hidden sm:inline-flex"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
        Tải thẻ thanh toán
      </Button>

      {/* off-screen render surface used only while exporting */}
      {exporting && selectedMonth && (
        <div
          ref={containerRef}
          aria-hidden
          style={{ position: "fixed", left: -100000, top: 0, opacity: 0, pointerEvents: "none" }}
        >
          {cards.map(({ bill, room }) => (
            <div key={room.id} data-card={room.code} style={{ width: 420 }}>
              <PaymentCardView
                bill={bill}
                room={room}
                month={selectedMonth}
                tenantName={bill.tenant_name}
                buildingName={settings?.building_name ?? "MH71"}
                qrUrl={settings?.qr_code_url}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
