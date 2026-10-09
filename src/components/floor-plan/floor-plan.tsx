"use client";

import * as React from "react";
import {
  Check,
  Store,
  TriangleAlert,
  MapPin,
  ChevronUp,
  ChevronRight,
  Video,
  CalendarDays,
  MousePointerClick,
  ReceiptText,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusChip } from "@/components/tenants/status-menu";
import { formatDate, formatNumber, formatVND, formatVNDShort, formatDateTimeLong, tenancyDuration } from "@/lib/format";
import { paidAmountOf } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  ALLEY_ROW,
  DEPTH,
  FAR_ROW,
  matchesQuery,
  tenureShort,
  type Lens,
  type Orientation,
  type RoomView,
  type Side,
} from "./layout";

export interface FloorPlanProps {
  views: Map<string, RoomView>; // by room code
  orientation: Orientation;
  lens: Lens;
  query: string;
  selectedCode: string | null;
  maxUnits: number;
  onSelect: (code: string, el: HTMLElement) => void;
}

// =====================================================================
// The floor plan. The building is a CSS grid; the surroundings (main road,
// alley, neighbours) are faint strips around it. Same component for both
// orientations — only the grid placement changes.
// =====================================================================
export function FloorPlan(props: FloorPlanProps) {
  const { orientation } = props;
  const [hover, setHover] = React.useState<{ code: string; rect: DOMRect } | null>(null);
  const horizontal = orientation === "horizontal";

  const tiles = (["alley", "far"] as Side[]).flatMap((side) =>
    (side === "alley" ? ALLEY_ROW : FAR_ROW).map((code, index) => {
      const place: React.CSSProperties = horizontal
        ? { gridColumn: index + 2, gridRow: side === "alley" ? 1 : 3 }
        : { gridColumn: side === "alley" ? 1 : 3, gridRow: DEPTH - index + 1 };
      return (
        <div key={code} style={place} className="min-w-0">
          <RoomTile
            {...props}
            code={code}
            side={side}
            order={side === "alley" ? index * 2 : index * 2 + 1}
            onSelect={(c, el) => {
              setHover(null);
              props.onSelect(c, el);
            }}
            onHover={(el) => setHover(el ? { code, rect: el.getBoundingClientRect() } : null)}
          />
        </div>
      );
    }),
  );

  const building = (
    <div
      className="fp-building relative grid gap-1.5 rounded-2xl p-1.5 sm:gap-2 sm:p-2"
      style={
        horizontal
          ? {
              gridTemplateColumns: `2.75rem repeat(${DEPTH}, minmax(3.6rem, 1fr)) 0.75rem`,
              gridTemplateRows: "minmax(8.75rem, auto) 2.5rem minmax(8.75rem, auto)",
            }
          : {
              gridTemplateColumns: "minmax(0, 1fr) 1.9rem minmax(0, 1fr)",
              gridTemplateRows: `0.75rem repeat(${DEPTH}, minmax(3.9rem, auto)) 3rem`,
            }
      }
    >
      {/* back wall — links the last two rooms (P24 ↔ P23) */}
      <div
        aria-hidden
        className="fp-wall rounded-md"
        style={horizontal ? { gridColumn: DEPTH + 2, gridRow: "1 / 4" } : { gridColumn: "1 / 4", gridRow: 1 }}
      />
      {/* shared corridor between the two rows */}
      <div
        aria-hidden
        className={cn("fp-corridor relative rounded-lg", horizontal ? "fp-corridor-h" : "fp-corridor-v")}
        style={
          horizontal
            ? { gridColumn: `2 / ${DEPTH + 2}`, gridRow: 2 }
            : { gridColumn: 2, gridRow: `2 / ${DEPTH + 2}` }
        }
      >
        <span
          className={cn(
            "fp-label absolute",
            horizontal ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--fp-floor)] px-2" : "fp-vlabel left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--fp-floor)] py-2",
          )}
        >
          Lối đi chung
        </span>
      </div>
      {/* forecourt + gate, facing the main road */}
      <div
        className={cn(
          "fp-court relative flex items-center justify-center rounded-lg",
          horizontal ? "flex-col" : "flex-row",
        )}
        style={horizontal ? { gridColumn: 1, gridRow: "1 / 4" } : { gridColumn: "1 / 4", gridRow: DEPTH + 2 }}
      >
        <span
          className={cn(
            "absolute flex items-center gap-1 text-primary",
            horizontal ? "left-1/2 top-2 -translate-x-1/2 flex-col" : "left-2 top-1/2 -translate-y-1/2",
          )}
          title="Nhà trọ Mỹ Hạnh 71"
        >
          <MapPin className="h-4 w-4 drop-shadow" />
          <span className="text-[0.6rem] font-extrabold tracking-wider">MH71</span>
        </span>
        <span className={cn("flex items-center gap-0.5 text-primary", horizontal ? "flex-col" : "flex-col-reverse")}>
          {horizontal ? (
            <ChevronRight className="fp-nudge-x h-5 w-5" />
          ) : (
            <ChevronUp className="fp-nudge-y h-5 w-5" />
          )}
          <span className="fp-label !text-primary/80">Cổng</span>
        </span>
      </div>
      {tiles}
    </div>
  );

  return (
    <div className="fp-canvas relative p-1 sm:p-2">
      {horizontal ? (
        <div className="flex gap-2 sm:gap-3">
          <Road direction="vertical" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-3">
            <Alley direction="horizontal" />
            {building}
            <Neighbours direction="horizontal" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Alley direction="vertical" />
            <div className="min-w-0 flex-1">{building}</div>
            <Neighbours direction="vertical" />
          </div>
          <Road direction="horizontal" />
        </div>
      )}

      {hover && props.views.get(hover.code) && (
        <RoomHoverCard view={props.views.get(hover.code)!} rect={hover.rect} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// surroundings — deliberately faint
// ---------------------------------------------------------------------
function Road({ direction }: { direction: "vertical" | "horizontal" }) {
  const v = direction === "vertical";
  return (
    <div
      aria-label="Đường Giồng Lớn (đường chính)"
      className={cn(
        "fp-road relative flex shrink-0 items-center justify-center rounded-xl",
        v ? "fp-road-v w-10 self-stretch sm:w-12" : "fp-road-h h-10",
      )}
    >
      <span className={cn("fp-label relative bg-[var(--fp-road)] tracking-[0.3em]", v ? "fp-vlabel py-3" : "px-3")}>
        Đường Giồng Lớn
      </span>
    </div>
  );
}

function Alley({ direction }: { direction: "vertical" | "horizontal" }) {
  const v = direction === "vertical";
  return (
    <div
      aria-label="Hẻm"
      className={cn(
        "fp-alley relative flex shrink-0 items-center justify-center rounded-lg",
        v ? "fp-alley-v w-5 self-stretch" : "h-6",
      )}
    >
      <span className={cn("fp-label", v && "fp-vlabel")}>Hẻm</span>
    </div>
  );
}

function Neighbours({ direction }: { direction: "vertical" | "horizontal" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "fp-hatch fp-neighbours shrink-0 rounded-lg opacity-70",
        direction === "vertical" ? "w-3 self-stretch [--fp-nb-dir:to_right]" : "h-4",
      )}
    />
  );
}

// ---------------------------------------------------------------------
// a room
// ---------------------------------------------------------------------
export type Tone = "none" | "vacant" | "paid" | "under" | "unpaid" | "power" | "unread" | "people";

export function toneOf(v: RoomView | undefined, lens: Lens): Tone {
  if (!v || !v.bill) return "none";
  if (lens === "power") return v.recorded ? "power" : "unread";
  if (v.vacant) return "vacant";
  if (lens === "people") return "people";
  if (v.underpaid) return "under";
  return v.paid ? "paid" : "unpaid";
}

const TONE_CLASS: Record<Tone, string> = {
  none: "border-border bg-surface text-muted",
  vacant: "fp-hatch border-dashed border-border bg-transparent text-muted",
  paid: "border-success/35 bg-[color-mix(in_srgb,var(--success)_13%,var(--surface))]",
  under: "border-warning/45 bg-[color-mix(in_srgb,var(--warning)_14%,var(--surface))]",
  unpaid: "border-danger/30 bg-[color-mix(in_srgb,var(--danger)_6%,var(--surface))]",
  power: "border-primary/30",
  unread: "fp-hatch border-dashed border-border bg-transparent text-muted",
  people: "border-border bg-surface",
};

const DOOR_CLASS: Record<Tone, string> = {
  none: "bg-border",
  vacant: "bg-muted/40",
  paid: "bg-success",
  under: "bg-warning",
  unpaid: "bg-danger",
  power: "bg-primary",
  unread: "bg-muted/40",
  people: "bg-info",
};

function RoomTile({
  code,
  side,
  order,
  views,
  orientation,
  lens,
  query,
  selectedCode,
  maxUnits,
  onSelect,
  onHover,
}: FloorPlanProps & {
  code: string;
  side: Side;
  order: number;
  onHover: (el: HTMLElement | null) => void;
}) {
  const v = views.get(code);
  const horizontal = orientation === "horizontal";
  const tone = toneOf(v, lens);
  const selected = selectedCode === code;
  const searching = query.trim().length > 0;
  const match = searching && !!v && matchesQuery(v, query);
  const kiosk = code.startsWith("K");
  const debt = (v?.prevOwed ?? 0) > 0;

  // numbered rooms open onto the shared corridor; the kiosks open onto the road
  const door = kiosk
    ? horizontal
      ? "left-0 top-1/2 w-[3px] h-2/5 -translate-y-1/2 rounded-r-full"
      : "bottom-0 left-1/2 h-[3px] w-2/5 -translate-x-1/2 rounded-t-full"
    : horizontal
    ? side === "alley"
      ? "bottom-0 left-1/2 h-[3px] w-2/5 -translate-x-1/2 rounded-t-full"
      : "top-0 left-1/2 h-[3px] w-2/5 -translate-x-1/2 rounded-b-full"
    : side === "alley"
      ? "right-0 top-1/2 w-[3px] h-2/5 -translate-y-1/2 rounded-l-full"
      : "left-0 top-1/2 w-[3px] h-2/5 -translate-y-1/2 rounded-r-full";

  const powerStyle: React.CSSProperties | undefined =
    tone === "power" && v?.bill
      ? {
          background: `color-mix(in srgb, var(--primary) ${Math.round(
            6 + 46 * Math.min(1, v.bill.units / Math.max(1, maxUnits)),
          )}%, var(--surface))`,
        }
      : undefined;

  const num = code.replace(/^\D+/, "");
  const prefix = code.replace(/\d+$/, "");
  const codeEl = (
    <span
      className={cn(
        "flex items-baseline font-extrabold leading-none tracking-tight tabular-nums",
        debt ? "text-warning" : tone === "none" || tone === "vacant" ? "text-muted" : "text-foreground",
        horizontal ? "text-xl" : "text-xl",
      )}
    >
      <span className={cn(!kiosk && "text-[0.62em] opacity-55")}>{prefix}</span>
      {num}
    </span>
  );

  return (
    <button
      type="button"
      data-fp-room={code}
      aria-label={`Phòng ${code}${v?.name ? ` — ${v.name}` : ""}`}
      aria-pressed={selected}
      onClick={(e) => onSelect(code, e.currentTarget)}
      onPointerEnter={(e) => e.pointerType === "mouse" && onHover(e.currentTarget)}
      onPointerLeave={() => onHover(null)}
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && onHover(e.currentTarget)}
      onBlur={() => onHover(null)}
      style={{ ...powerStyle, animationDelay: `${order * 18}ms` }}
      className={cn(
        "fp-tile @container group relative flex h-full w-full overflow-hidden rounded-xl border text-left",
        "transition-[transform,box-shadow,opacity,filter] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        TONE_CLASS[tone],
        debt && "ring-1 ring-warning/60",
        searching && !match && "scale-[0.97] opacity-25 saturate-0",
        match && "fp-match",
        selected && "z-10 -translate-y-0.5 shadow-xl ring-2 ring-primary",
      )}
    >
      <span aria-hidden className={cn("absolute", door, DOOR_CLASS[tone])} />

      {horizontal ? (
        // portrait tile: code / avatar / name / metric
        <span className="flex min-w-0 flex-1 flex-col gap-1.5 p-2">
          <span className="flex items-start justify-between gap-1">
            {codeEl}
            <TileBadges v={v} tone={tone} kiosk={kiosk} debt={debt} />
          </span>
          {v && !v.vacant && v.name ? (
            <Avatar name={v.name} photoUrl={v.photoUrl} size={30} className="shadow-sm ring-2 ring-surface" />
          ) : (
            <span className="h-[30px]" />
          )}
          <span
            className={cn(
              "line-clamp-2 min-h-[2lh] text-[0.72rem] font-semibold leading-tight",
              (!v?.name || v.vacant) && "font-medium italic text-muted",
            )}
          >
            {v && !v.vacant && v.name ? v.name : v?.bill ? "Phòng trống" : "—"}
          </span>
          <span className="mt-auto">
            <Metric v={v} lens={lens} tone={tone} />
          </span>
        </span>
      ) : (
        // landscape tile: code | name + metric | badges
        <span className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-2.5 pr-2">
          <span className="w-8 shrink-0">{codeEl}</span>
          {v && !v.vacant && v.name && (
            <Avatar
              name={v.name}
              photoUrl={v.photoUrl}
              size={28}
              className="hidden shrink-0 shadow-sm @[12.5rem]:inline-flex"
            />
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className={cn(
                "truncate text-[0.75rem] font-semibold leading-tight",
                (!v?.name || v.vacant) && "font-medium italic text-muted",
              )}
            >
              {v && !v.vacant && v.name ? v.name : v?.bill ? "Phòng trống" : "—"}
            </span>
            <Metric v={v} lens={lens} tone={tone} />
          </span>
          <TileBadges v={v} tone={tone} kiosk={kiosk} debt={debt} stacked />
        </span>
      )}
    </button>
  );
}

function TileBadges({
  v,
  tone,
  kiosk,
  debt,
  stacked,
}: {
  v: RoomView | undefined;
  tone: Tone;
  kiosk: boolean;
  debt: boolean;
  stacked?: boolean;
}) {
  return (
    <span className={cn("flex shrink-0 items-center gap-1", stacked && "flex-col")}>
      {debt && (
        <span title="Còn nợ tháng trước" className="text-warning">
          <TriangleAlert className="h-3.5 w-3.5" />
        </span>
      )}
      {tone === "paid" && (
        <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-success text-white shadow-sm">
          <Check className="h-3 w-3 stroke-[3.5]" />
        </span>
      )}
      {tone === "under" && (
        <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-warning text-white shadow-sm">
          <Check className="h-3 w-3 stroke-[3.5]" />
        </span>
      )}
      {tone === "unpaid" && <span className="fp-pulse h-2.5 w-2.5 rounded-full bg-danger" />}
      {kiosk && !debt && tone !== "paid" && tone !== "under" && tone !== "unpaid" && (
        <Store className="h-3.5 w-3.5 text-muted" />
      )}
      {v?.tenant?.camera_access && !v.vacant && tone === "people" && (
        <Video className="h-3.5 w-3.5 text-primary" />
      )}
    </span>
  );
}

export function Metric({ v, lens, tone }: { v: RoomView | undefined; lens: Lens; tone: Tone }) {
  const base = "block truncate text-sm font-bold leading-tight tabular-nums";
  if (!v?.bill) return <span className={cn(base, "text-muted")}>—</span>;
  const b = v.bill;

  if (lens === "power") {
    return v.recorded ? (
      <span className={base}>
        {formatNumber(b.units)}
        <span className="ml-0.5 text-[0.7em] font-semibold text-muted">số</span>
      </span>
    ) : (
      <span className={cn(base, "text-xs font-semibold text-muted")}>chưa ghi</span>
    );
  }

  if (lens === "people") {
    if (v.vacant) return <span className={cn(base, "text-xs font-semibold text-muted")}>Trống</span>;
    const t = tenureShort(v.tenant?.move_in_date);
    return (
      <span className={cn(base, "text-xs font-semibold text-info")}>{t ? `ở ${t}` : (v.phone ?? "—")}</span>
    );
  }

  if (v.vacant) return <span className={cn(base, "text-xs font-semibold text-muted")}>Trống</span>;
  if (tone === "under") {
    return (
      <span className={cn(base, "text-warning")}>
        {formatVNDShort(paidAmountOf(b))}
        <span className="text-[0.75em] font-semibold text-muted">/{formatVNDShort(b.total)}</span>
      </span>
    );
  }
  return (
    <span className={cn(base, tone === "paid" ? "text-success" : "text-foreground")}>
      {formatVNDShort(b.total)}
    </span>
  );
}

// ---------------------------------------------------------------------
// hover card (mouse only) — the full numbers without opening anything
// ---------------------------------------------------------------------
export function RoomHoverCard({
  view: v,
  rect,
  pinned,
  onOpen,
  onClose,
}: {
  view: RoomView;
  rect: DOMRect;
  /** pinned (3D: a selected room) — interactive, with a button to open the full sheet */
  pinned?: boolean;
  onOpen?: (el: HTMLElement) => void;
  onClose?: () => void;
}) {
  const W = 288;
  // measured height, so the card can be kept fully inside the window
  const ref = React.useRef<HTMLDivElement>(null);
  const [h, setH] = React.useState(300);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el && Math.abs(el.offsetHeight - h) > 1) setH(el.offsetHeight);
  });
  const left = Math.min(Math.max(rect.left + rect.width / 2 - W / 2, 8), window.innerWidth - W - 8);
  // above the room when it fits, else below; always clamped on screen
  const above = rect.top - 10 - h >= 8;
  const top = Math.min(
    Math.max(above ? rect.top - 10 - h : rect.bottom + 10, 8),
    window.innerHeight - h - 8,
  );
  const style: React.CSSProperties = { left, top, width: W };

  return (
    <div
      role={pinned ? "dialog" : "tooltip"}
      aria-label={pinned ? `Phòng ${v.room.code}` : undefined}
      // data-fp3-ui: the 3D viewport ignores pointer-downs from here (portal
      // events still bubble to it through the React tree)
      data-fp3-ui
      ref={ref}
      style={style}
      className={cn("fp-pop fixed z-[60]", !pinned && "pointer-events-none")}
    >
      <RoomDetailCard
        view={v}
        className={cn("bg-surface/95 backdrop-blur", pinned && "border-primary/50 ring-1 ring-primary/30")}
        onClose={pinned ? onClose : undefined}
        footer={
          pinned ? (
            <button
              type="button"
              onClick={(e) => onOpen?.(e.currentTarget)}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ReceiptText className="h-4 w-4" />
              Xem chi tiết &amp; thu tiền
            </button>
          ) : undefined
        }
      />
    </div>
  );
}

/** The full at-a-glance card for one room (2D hover, 3D hover). */
export function RoomDetailCard({
  view: v,
  className,
  footer,
  onClose,
}: {
  view: RoomView;
  className?: string;
  /** replaces the "click to open" hint */
  footer?: React.ReactNode;
  onClose?: () => void;
}) {
  const b = v.bill;
  const tenure = !v.vacant ? tenancyDuration(v.tenant?.move_in_date) : null;

  return (
    <div className={cn("relative w-full rounded-2xl border border-border bg-surface p-3.5 text-left shadow-2xl", className)}>
      {onClose && (
        <button
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-md hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="flex items-center gap-3">
        {v.name && !v.vacant ? (
          <Avatar name={v.name} photoUrl={v.photoUrl} size={40} />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-muted">
            {v.room.code}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-primary">{v.room.code}</span>
            <span className="truncate font-semibold">{v.vacant ? "Phòng trống" : (v.name ?? "—")}</span>
          </div>
          <div className="truncate text-xs text-muted">{v.vacant ? "Chưa có người thuê" : (v.phone ?? "Chưa có SĐT")}</div>
        </div>
        {b && <StatusChip status={v.status ?? b.payment_status} />}
      </div>

      {!v.vacant && (v.tenant?.move_in_date || v.tenant?.camera_access) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {v.tenant?.move_in_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Vào ở {formatDate(v.tenant.move_in_date)}
              {tenure ? ` · ${tenure}` : ""}
            </span>
          )}
          {v.tenant?.camera_access && (
            <span className="inline-flex items-center gap-1 text-primary">
              <Video className="h-3.5 w-3.5" />
              Camera
            </span>
          )}
        </div>
      )}

      {b ? (
        <div className="mt-3 flex flex-col gap-1 border-t border-border pt-2.5 text-sm">
          <Line
            label="Tiền điện"
            hint={v.recorded ? `${formatNumber(b.reading_old)} → ${formatNumber(b.reading_new)} · ${formatNumber(b.units)} số` : "chưa ghi số"}
            value={v.recorded ? formatVND(b.electricity_amount) : "—"}
          />
          {!v.vacant && <Line label="Tiền phòng" value={formatVND(b.room_fee)} />}
          {!v.vacant && <Line label="Tiền rác" value={formatVND(b.trash_fee)} />}
          <div className="mt-1 flex items-center justify-between rounded-lg bg-surface-2 px-2.5 py-1.5">
            <span className="font-bold">Tổng</span>
            <span className="font-extrabold text-primary tabular-nums">{formatVND(b.total)}</span>
          </div>
          {v.underpaid && (
            <div className="text-right text-xs font-semibold text-warning">
              Đã thu {formatVND(paidAmountOf(b))} · còn {formatVND(v.owed)}
            </div>
          )}
          {b.paid_at && v.paid && (
            <div className="text-right text-xs text-muted">Thu lúc {formatDateTimeLong(b.paid_at)}</div>
          )}
          {v.prevOwed > 0 && (
            <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-warning-surface px-2.5 py-1.5 text-xs font-semibold text-warning">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              Còn nợ tháng trước {formatVND(v.prevOwed)}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 border-t border-border pt-2.5 text-sm text-muted">Tháng này chưa có hoá đơn.</p>
      )}
      {footer ?? (
        <p className="mt-2.5 flex items-center justify-center gap-1 text-center text-[0.68rem] font-medium text-muted">
          <MousePointerClick className="h-3 w-3" />
          Bấm để mở chi tiết &amp; thu tiền
        </p>
      )}
    </div>
  );
}

function Line({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0">
        <span className="text-muted">{label}</span>
        {hint && <span className="ml-1.5 text-[0.7rem] text-muted/80">{hint}</span>}
      </span>
      <span className="shrink-0 font-semibold tabular-nums">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------
// mini locator — tiny version of the plan with one room lit up
// ---------------------------------------------------------------------
export function MiniLocator({ code, orientation }: { code: string; orientation: Orientation }) {
  const horizontal = orientation === "horizontal";
  const cell = (c: string) => (
    <span
      key={c}
      className={cn(
        "rounded-[3px] transition-colors",
        c === code ? "fp-match bg-primary" : "bg-[color-mix(in_srgb,var(--muted-foreground)_22%,transparent)]",
      )}
    />
  );
  if (horizontal) {
    return (
      <div aria-hidden className="flex w-40 shrink-0 gap-1">
        <span className="fp-road w-2 rounded-sm" />
        <div className="flex flex-1 flex-col gap-[3px]">
          <span className="fp-alley h-1 rounded-sm" />
          <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: `repeat(${DEPTH}, 1fr)`, gridTemplateRows: "0.55rem 0.3rem 0.55rem" }}>
            {ALLEY_ROW.map((c) => cell(c))}
            <span style={{ gridColumn: `1 / ${DEPTH + 1}` }} />
            {FAR_ROW.map((c) => cell(c))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div aria-hidden className="flex h-24 shrink-0 flex-col gap-1">
      <div className="flex flex-1 gap-[3px]">
        <span className="fp-alley w-1 rounded-sm" />
        <div className="grid gap-[2px]" style={{ gridTemplateColumns: "0.8rem 0.3rem 0.8rem", gridTemplateRows: `repeat(${DEPTH}, 1fr)` }}>
          {[...Array(DEPTH)].flatMap((_, r) => {
            const i = DEPTH - 1 - r;
            return [cell(ALLEY_ROW[i]), <span key={`gap-${i}`} />, cell(FAR_ROW[i])];
          })}
        </div>
      </div>
      <span className="fp-road h-1.5 rounded-sm" />
    </div>
  );
}
