"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X, Phone, MessageCircle, Zap, CalendarDays, Video, StickyNote, Lock } from "lucide-react";
import { TenantRow } from "@/components/tenants/tenant-row";
import { formatDate, formatNumber, tenancyDuration } from "@/lib/format";
import type { MonthRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { MiniLocator } from "./floor-plan";
import { positionLabel, type Orientation, type RoomView } from "./layout";

export type SheetSide = "left" | "right";

/**
 * Room detail. Phones: a modal bottom sheet (swipe the handle down to close).
 * Desktop: a NON-modal floating drawer on the side away from the tapped room,
 * so the map stays visible and tapping another room just switches to it.
 * The body is the same editable TenantRow used on Phòng thuê / Tổng quan, so
 * thu tiền, sửa thông tin, thẻ thanh toán, trả phòng… all work as usual.
 */
export function RoomSheet({
  view,
  open,
  onOpenChange,
  desktop,
  side,
  orientation,
  month,
  buildingName,
  locked,
  onStep,
}: {
  view: RoomView | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  desktop: boolean;
  side: SheetSide;
  orientation: Orientation;
  month: MonthRow;
  buildingName: string;
  locked: boolean;
  onStep: (dir: -1 | 1) => void;
}) {
  // swipe-to-close on the phone sheet's handle
  const [drag, setDrag] = React.useState(0);
  const startY = React.useRef<number | null>(null);

  function onKeyDown(e: React.KeyboardEvent) {
    // only for keys pressed inside the sheet itself (nested dialogs bubble here
    // through the React tree) and never while typing
    const t = e.target as HTMLElement;
    if (!e.currentTarget.contains(t) || t.closest("input,textarea,select,[contenteditable=true],[role=menu]")) return;
    if (e.key === "ArrowLeft") onStep(-1);
    if (e.key === "ArrowRight") onStep(1);
  }

  const v = view;
  const tenant = v && !v.vacant ? v.tenant : null;
  const b = v?.bill ?? null;
  const tel = (v?.phone ?? "").replace(/[^\d+]/g, "");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={!desktop}>
      <DialogPrimitive.Portal>
        {!desktop && (
          <DialogPrimitive.Overlay className="fp-overlay fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
        )}
        <DialogPrimitive.Content
          data-side={side}
          onKeyDown={onKeyDown}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // tapping another room on the map switches rooms instead of closing
            const target = e.target as Element | null;
            // …and dragging the 3D view around doesn't close it either
            if (target?.closest?.("[data-fp-room],[data-fp-keep]")) e.preventDefault();
          }}
          style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
          className={cn(
            "fp-sheet fixed z-50 flex flex-col overflow-hidden border-border bg-surface shadow-2xl outline-none transition-transform",
            "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-3xl border-t",
            "md:inset-x-auto md:bottom-4 md:top-4 md:max-h-none md:w-[30rem] md:rounded-3xl md:border",
            side === "right" ? "md:right-4" : "md:left-4",
          )}
        >
          {/* header */}
          <div
            className="relative shrink-0 touch-none border-b border-border bg-gradient-to-b from-primary/10 to-transparent px-4 pb-3 pt-2 md:touch-auto md:pt-4"
            onPointerDown={(e) => {
              if (desktop || (e.target as HTMLElement).closest("button")) return;
              startY.current = e.clientY;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (startY.current == null) return;
              setDrag(Math.max(0, e.clientY - startY.current));
            }}
            onPointerUp={() => {
              if (startY.current == null) return;
              startY.current = null;
              if (drag > 90) onOpenChange(false);
              setDrag(0);
            }}
            onPointerCancel={() => {
              startY.current = null;
              setDrag(0);
            }}
          >
            <div className="mx-auto mb-2.5 h-1.5 w-11 rounded-full bg-muted/30 md:hidden" />
            <div className="flex items-center gap-3.5">
              {v && <MiniLocator code={v.room.code} orientation={orientation} />}
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
                  {v ? `Phòng ${v.room.code}` : "Phòng"}
                  {locked && (
                    <span title="Tháng đã khoá" className="text-muted">
                      <Lock className="h-4 w-4" />
                    </span>
                  )}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-0.5 text-xs font-medium text-muted">
                  {v ? positionLabel(v.room.code) : ""}
                </DialogPrimitive.Description>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <IconBtn label="Phòng trước (←)" onClick={() => onStep(-1)}>
                  <ChevronLeft className="h-5 w-5" />
                </IconBtn>
                <IconBtn label="Phòng sau (→)" onClick={() => onStep(1)}>
                  <ChevronRight className="h-5 w-5" />
                </IconBtn>
                <DialogPrimitive.Close asChild>
                  <IconBtn label="Đóng">
                    <X className="h-5 w-5" />
                  </IconBtn>
                </DialogPrimitive.Close>
              </div>
            </div>
          </div>

          {/* body */}
          {v && (
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4">
              {/* facts the other tabs don't show at a glance */}
              <div className="grid grid-cols-2 gap-2">
                <Fact
                  icon={<Zap className="h-4 w-4" />}
                  label="Chỉ số điện"
                  value={
                    b
                      ? `${formatNumber(b.reading_old)} → ${b.reading_new == null ? "…" : formatNumber(b.reading_new)}`
                      : "—"
                  }
                  sub={b ? (v.recorded ? `${formatNumber(b.units)} số × ${formatNumber(b.electricity_rate)}đ` : "Chưa ghi số điện") : undefined}
                  tone={b && !v.recorded ? "warning" : undefined}
                />
                <Fact
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Vào ở"
                  value={tenant?.move_in_date ? formatDate(tenant.move_in_date) : "—"}
                  sub={tenancyDuration(tenant?.move_in_date) ?? (v.vacant ? "Phòng trống" : undefined)}
                />
              </div>

              {tenant && (tel || tenant.camera_access || tenant.notes) && (
                <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-2/50 p-3">
                  {tel && (
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-semibold tabular-nums">{v.phone}</span>
                      <a
                        href={`tel:${tel}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-success px-3 text-sm font-semibold text-white hover:opacity-90"
                      >
                        <Phone className="h-4 w-4" />
                        Gọi
                      </a>
                      <a
                        href={`https://zalo.me/${tel.replace(/^\+84/, "0")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-info px-3 text-sm font-semibold text-white hover:opacity-90"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Zalo
                      </a>
                    </div>
                  )}
                  {tenant.camera_access && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Video className="h-4 w-4" />
                      Được truy cập camera
                    </div>
                  )}
                  {tenant.notes && (
                    <div className="flex items-start gap-2 text-sm text-muted">
                      <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="whitespace-pre-wrap">{tenant.notes}</span>
                    </div>
                  )}
                </div>
              )}

              <TenantRow
                key={v.room.id}
                room={v.room}
                bill={v.bill}
                tenant={v.tenant}
                photoUrl={v.photoUrl}
                month={month}
                buildingName={buildingName}
                open
                hideChevron
                hidePriceOnTop
                highlighted={false}
                onOpenChange={() => {
                  /* the sheet owns open/close */
                }}
              />
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const IconBtn = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
>(({ label, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-label={label}
    title={label}
    className={cn(
      "flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      className,
    )}
    {...props}
  />
));
IconBtn.displayName = "IconBtn";

function Fact({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "warning";
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1 truncate font-bold tabular-nums">{value}</div>
      {sub && <div className={cn("truncate text-xs", tone === "warning" ? "text-warning" : "text-muted")}>{sub}</div>}
    </div>
  );
}
