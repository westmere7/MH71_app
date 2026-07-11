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

// Minimal File System Access API shapes (not in the TS DOM lib we target).
type FSWritable = { write: (data: Blob) => Promise<void>; close: () => Promise<void> };
type FSFileHandle = { createWritable: () => Promise<FSWritable> };
type FileSystemDirectory = {
  getDirectoryHandle: (name: string, opts?: { create?: boolean }) => Promise<FileSystemDirectory>;
  getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<FSFileHandle>;
};

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

  async function downloadAll() {
    if (!selectedMonth || busy) return;
    if (cards.length === 0) {
      toast.error("Không có thẻ để tải.");
      return;
    }
    const folder = `Thang ${selectedMonth.month}.${selectedMonth.year}`;

    // Option A: pick a folder FIRST — showDirectoryPicker needs the click's user
    // activation, which the slow render below would otherwise consume.
    const picker = (window as unknown as { showDirectoryPicker?: () => Promise<FileSystemDirectory> })
      .showDirectoryPicker;
    let dirHandle: FileSystemDirectory | null = null;
    if (typeof picker === "function") {
      try {
        dirHandle = await picker();
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return; // user cancelled
        console.warn("showDirectoryPicker unavailable, falling back to zip:", e);
      }
    }

    setBusy(true);
    setExporting(true);
    try {
      // let the hidden cards mount + their QR images load before capturing
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      const container = containerRef.current;
      if (!container) throw new Error("render surface missing");
      await waitForImages(container);

      const nodes = Array.from(container.querySelectorAll<HTMLElement>("[data-card]"));
      const files: { name: string; blob: Blob }[] = [];
      for (const node of nodes) {
        const code = node.getAttribute("data-card") || "phong";
        const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
        files.push({ name: `${code}.png`, blob: await (await fetch(dataUrl)).blob() });
      }

      if (dirHandle) {
        // Option A: write each PNG into a "Thang M.YYYY" subfolder — no zip
        const sub = await dirHandle.getDirectoryHandle(folder, { create: true });
        for (const f of files) {
          const fh = await sub.getFileHandle(f.name, { create: true });
          const w = await fh.createWritable();
          await w.write(f.blob);
          await w.close();
        }
        toast.success(`Đã lưu ${files.length} thẻ vào thư mục “${folder}”`);
      } else {
        // Fallback: bundle into a single ZIP download
        const zip = new JSZip();
        for (const f of files) zip.file(`${folder}/${f.name}`, f.blob);
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${folder}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Đã tải ${files.length} thẻ thanh toán (zip)`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Không tải được thẻ, thử lại.");
    } finally {
      setExporting(false);
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size="lg"
        onClick={downloadAll}
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
