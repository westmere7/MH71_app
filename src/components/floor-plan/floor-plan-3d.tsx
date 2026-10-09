"use client";

import * as React from "react";
import {
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Focus,
  Orbit,
  Pause,
  TriangleAlert,
  Navigation2,
  Tags,
  MousePointer2,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Metric, toneOf, type Tone } from "./floor-plan";
import { ALLEY_ROW, DEPTH, FAR_ROW, matchesQuery, type Lens, type RoomView, type Side } from "./layout";

// =====================================================================
// 3D view (desktop). Pure CSS 3D: a "world" div is tilted/rotated by the
// camera (CSS custom properties, so labels can counter-rotate and every
// camera move animates through registered @property transitions). Rooms are
// boxes of 5 faces; their labels are billboarded "call cards" floating above.
//
// World units are px. x = depth from the road (front) to the back wall,
// y = across: alley row → corridor → far row. +z = up.
// =====================================================================

const CW = 96; // room width along the building
const RD = 128; // room depth (row → corridor)
const CD = 64; // corridor width
const H = 54; // wall height
const GAP = 6; // gap between neighbouring rooms
const LEN = DEPTH * CW;
const WY = RD * 2 + CD;
const CX = LEN / 2;
const CY = WY / 2;

interface Cam {
  yaw: number; // deg
  pitch: number; // deg, 0 = straight down
  zoom: number;
  px: number;
  py: number;
}

const PRESETS: { key: string; label: string; cam: Omit<Cam, "zoom" | "px" | "py"> }[] = [
  { key: "overview", label: "Toàn cảnh", cam: { yaw: -18, pitch: 55 } },
  { key: "top", label: "Từ trên", cam: { yaw: 0, pitch: 0 } },
  { key: "road", label: "Từ mặt đường", cam: { yaw: -90, pitch: 66 } },
  { key: "alley", label: "Từ hẻm", cam: { yaw: 180, pitch: 60 } },
];

const PITCH_MIN = 0;
const PITCH_MAX = 78;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3;
const INFO_KEY = "mh71.sodo.3d.info";
const DETAIL_ZOOM = 0.95; // zoomed in this far → cards show the tenant name

export interface FloorPlan3DProps {
  views: Map<string, RoomView>;
  lens: Lens;
  query: string;
  selectedCode: string | null;
  maxUnits: number;
  onSelect: (code: string, el: HTMLElement) => void;
}

export function FloorPlan3D({ views, lens, query, selectedCode, maxUnits, onSelect }: FloorPlan3DProps) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const worldRef = React.useRef<HTMLDivElement>(null);
  const cam = React.useRef<Cam>({ yaw: -18, pitch: 55, zoom: 0.7, px: 0, py: 0 });
  const [detail, setDetail] = React.useState(false);
  const [auto, setAuto] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [yawDeg, setYawDeg] = React.useState(-18); // for the compass (updated sparingly)
  // floating info cards for every room — off by default; hover / selection
  // still shows the card for that one room. (Client-only component, so
  // reading storage in the initializer can't cause a hydration mismatch.)
  const [showInfo, setShowInfoState] = React.useState(() => {
    try {
      return localStorage.getItem(INFO_KEY) === "1";
    } catch {
      return false;
    }
  });
  const setShowInfo = (on: boolean) => {
    setShowInfoState(on);
    try {
      localStorage.setItem(INFO_KEY, on ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  // write the camera into CSS variables — no React render per frame
  const apply = React.useCallback((live: boolean) => {
    const w = worldRef.current;
    if (!w) return;
    const c = cam.current;
    w.classList.toggle("is-live", live);
    w.style.setProperty("--fp-yaw", `${c.yaw}deg`);
    w.style.setProperty("--fp-pitch", `${c.pitch}deg`);
    w.style.setProperty("--fp-zoom", String(c.zoom));
    w.style.setProperty("--fp-px", `${c.px}px`);
    w.style.setProperty("--fp-py", `${c.py}px`);
    setDetail(c.zoom >= DETAIL_ZOOM);
  }, []);

  const fitZoom = React.useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return 0.7;
    return clamp(Math.min(vp.clientWidth / (LEN + 420), vp.clientHeight / 640), ZOOM_MIN, 1.4);
  }, []);

  // initial framing
  React.useLayoutEffect(() => {
    cam.current.zoom = fitZoom();
    apply(true);
  }, [apply, fitZoom]);

  // animate to a camera pose, taking the shortest way round
  const goTo = React.useCallback(
    (next: Partial<Cam>) => {
      const c = cam.current;
      if (next.yaw != null) {
        const d = ((((next.yaw - c.yaw) % 360) + 540) % 360) - 180;
        next = { ...next, yaw: c.yaw + d };
      }
      Object.assign(c, next);
      setAuto(false);
      setYawDeg(c.yaw);
      apply(false);
    },
    [apply],
  );

  // ---- auto-rotate ("tự xoay") ----
  React.useEffect(() => {
    if (!auto || dragging) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      cam.current.yaw += (t - last) * 0.012;
      last = t;
      apply(true);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setYawDeg(cam.current.yaw);
    };
  }, [auto, dragging, apply]);

  // ---- wheel zoom toward the cursor (needs a non-passive listener) ----
  React.useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = cam.current;
      const r = vp.getBoundingClientRect();
      const mx = e.clientX - r.left - r.width / 2;
      const my = e.clientY - r.top - r.height / 2;
      const nz = clamp(c.zoom * Math.exp(-e.deltaY * 0.0015), ZOOM_MIN, ZOOM_MAX);
      c.px = mx - (mx - c.px) * (nz / c.zoom);
      c.py = my - (my - c.py) * (nz / c.zoom);
      c.zoom = nz;
      apply(true);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [apply]);

  // ---- drag: orbit (left) / pan (right, middle or shift) / click a room ----
  const drag = React.useRef<{
    mode: "orbit" | "pan";
    x: number;
    y: number;
    start: Cam;
    spin: 1 | -1; // yaw direction so the grabbed part follows the cursor
    moved: number;
    code: string | null;
    el: HTMLElement | null;
  } | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-fp3-ui]")) return;
    const roomEl = (e.target as HTMLElement).closest<HTMLElement>("[data-fp-room]");
    drag.current = {
      mode: e.button === 2 || e.button === 1 || e.shiftKey ? "pan" : "orbit",
      x: e.clientX,
      y: e.clientY,
      start: { ...cam.current },
      // grabbing the near half (below the building's centre) turns the other
      // way from grabbing the far half — like spinning a turntable by hand
      spin: e.clientY > centreY(e.currentTarget) ? -1 : 1,
      moved: 0,
      code: roomEl?.dataset.fpRoom ?? null,
      el: roomEl,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    setAuto(false);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.moved = Math.max(d.moved, Math.hypot(dx, dy));
    if (d.moved < 4) return;
    if (!dragging) setDragging(true);
    const c = cam.current;
    if (d.mode === "orbit") {
      c.yaw = d.start.yaw + d.spin * dx * 0.35;
      c.pitch = clamp(d.start.pitch - dy * 0.3, PITCH_MIN, PITCH_MAX);
    } else {
      c.px = d.start.px + dx;
      c.py = d.start.py + dy;
    }
    apply(true);
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    setYawDeg(cam.current.yaw);
    if (d && d.moved < 4 && d.code && d.el) onSelect(d.code, d.el);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const c = cam.current;
    const k = e.key;
    if (k === "ArrowLeft") goTo({ yaw: c.yaw - 15 });
    else if (k === "ArrowRight") goTo({ yaw: c.yaw + 15 });
    else if (k === "ArrowUp") goTo({ pitch: clamp(c.pitch + 8, PITCH_MIN, PITCH_MAX) });
    else if (k === "ArrowDown") goTo({ pitch: clamp(c.pitch - 8, PITCH_MIN, PITCH_MAX) });
    else if (k === "+" || k === "=") goTo({ zoom: clamp(c.zoom * 1.2, ZOOM_MIN, ZOOM_MAX) });
    else if (k === "-") goTo({ zoom: clamp(c.zoom / 1.2, ZOOM_MIN, ZOOM_MAX) });
    else return;
    e.preventDefault();
  }

  // screen y of the building's centre (viewport centre shifted by the pan)
  const centreY = (vp: HTMLElement) => {
    const r = vp.getBoundingClientRect();
    return r.top + r.height / 2 + cam.current.py;
  };

  const reset = () => goTo({ ...PRESETS[0].cam, zoom: fitZoom(), px: 0, py: 0 });
  const searching = query.trim().length > 0;

  return (
    <div
      ref={viewportRef}
      tabIndex={0}
      role="application"
      aria-label="Sơ đồ 3D — kéo để xoay, chuột phải để di chuyển, cuộn để phóng to"
      data-fp-keep
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={onKeyDown}
      onPointerOver={(e) => {
        if (drag.current) return;
        const el = (e.target as HTMLElement).closest<HTMLElement>("[data-fp-room]");
        setHovered(el?.dataset.fpRoom ?? null);
      }}
      onPointerLeave={() => setHovered(null)}
      className={cn(
        "fp3-viewport fp-canvas relative h-[min(74vh,48rem)] min-h-[30rem] w-full overflow-hidden rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        dragging && "is-dragging",
      )}
    >
      <div ref={worldRef} className="fp3-world">
        <Surroundings />

        {/* building slab + corridor floor */}
        <Flat x={-6} y={-6} w={LEN + 26} h={WY + 12} z={0.2} className="fp3-slab rounded-md" />
        <Flat x={0} y={RD} w={LEN} h={CD} z={1.5} className="fp-corridor fp-corridor-h flex items-center justify-center">
          <span className="fp-label bg-[var(--fp-floor)] px-3 !text-[0.7rem]">Lối đi chung</span>
        </Flat>
        <Flat x={-62} y={0} w={56} h={WY} z={1} className="fp3-court flex items-center justify-center rounded-l-xl">
          <span className="fp-label fp-vlabel !text-primary/70">Cổng</span>
        </Flat>

        {/* back wall closing the corridor, and the gate posts */}
        <Box x={LEN} y={0} w={14} d={WY} h={H} tone="wall" />
        <Box x={-8} y={RD - 3} w={8} d={8} h={H * 0.8} tone="wall" />
        <Box x={-8} y={RD + CD - 5} w={8} d={8} h={H * 0.8} tone="wall" />

        {(["alley", "far"] as Side[]).flatMap((side) =>
          (side === "alley" ? ALLEY_ROW : FAR_ROW).map((code, i) => {
            const v = views.get(code);
            const tone = toneOf(v, lens);
            const x = i * CW + GAP / 2;
            const y = side === "alley" ? GAP / 2 : RD + CD;
            const w = CW - GAP;
            const d = RD - GAP / 2;
            const kiosk = code.startsWith("K");
            // numbered rooms open onto the corridor; kiosks open onto the road
            const door: Wall = kiosk ? "west" : side === "alley" ? "south" : "north";
            const match = searching && !!v && matchesQuery(v, query);
            const active = selectedCode === code || hovered === code;
            return (
              <React.Fragment key={code}>
                <Box
                  x={x}
                  y={y}
                  w={w}
                  d={d}
                  h={H}
                  tone={tone}
                  roof={roofColor(tone, v, maxUnits)}
                  door={door}
                  kiosk={kiosk}
                  code={code}
                  lifted={active}
                  selected={selectedCode === code}
                  dim={searching && !match}
                  match={match}
                />
                {(showInfo || active) && (
                <CallCard
                  code={code}
                  v={v}
                  lens={lens}
                  tone={tone}
                  x={x + w / 2}
                  y={y + d / 2}
                  stem={i % 2 === 0 ? 34 : 70}
                  detail={detail || active || match}
                  selected={selectedCode === code}
                  dim={searching && !match}
                  onSelect={onSelect}
                />
                )}
              </React.Fragment>
            );
          }),
        )}
      </div>

      {/* ---------------- overlay UI ---------------- */}
      <div data-fp3-ui className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => goTo({ ...p.cam, ...(p.key === "overview" ? { zoom: fitZoom(), px: 0, py: 0 } : {}) })}
            className="rounded-full border border-border bg-surface/90 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur hover:border-primary/50 hover:text-primary"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div data-fp3-ui className="absolute bottom-3 right-3 flex items-center gap-1 rounded-2xl border border-border bg-surface/90 p-1 shadow-lg backdrop-blur">
        <CtlBtn label="Xoay trái" onClick={() => goTo({ yaw: cam.current.yaw - 45 })}>
          <RotateCcw className="h-4 w-4" />
        </CtlBtn>
        <CtlBtn label="Xoay phải" onClick={() => goTo({ yaw: cam.current.yaw + 45 })}>
          <RotateCw className="h-4 w-4" />
        </CtlBtn>
        <span className="mx-0.5 h-5 w-px bg-border" />
        <button
          type="button"
          aria-pressed={showInfo}
          title={showInfo ? "Ẩn thông tin các phòng (di chuột vào phòng vẫn hiện)" : "Hiện thông tin tất cả các phòng"}
          onClick={() => setShowInfo(!showInfo)}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-colors",
            showInfo ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground",
          )}
        >
          <Tags className="h-4 w-4" />
          Thông tin
        </button>
        <span className="mx-0.5 h-5 w-px bg-border" />
        <CtlBtn label="Thu nhỏ" onClick={() => goTo({ zoom: clamp(cam.current.zoom / 1.3, ZOOM_MIN, ZOOM_MAX) })}>
          <ZoomOut className="h-4 w-4" />
        </CtlBtn>
        <CtlBtn label="Phóng to" onClick={() => goTo({ zoom: clamp(cam.current.zoom * 1.3, ZOOM_MIN, ZOOM_MAX) })}>
          <ZoomIn className="h-4 w-4" />
        </CtlBtn>
        <span className="mx-0.5 h-5 w-px bg-border" />
        <CtlBtn label="Về góc nhìn ban đầu" onClick={reset}>
          <Focus className="h-4 w-4" />
        </CtlBtn>
        <CtlBtn label={auto ? "Dừng tự xoay" : "Tự xoay"} active={auto} onClick={() => setAuto((a) => !a)}>
          {auto ? <Pause className="h-4 w-4" /> : <Orbit className="h-4 w-4" />}
        </CtlBtn>
      </div>

      {/* compass: points at the main road; click to face it */}
      <button
        data-fp3-ui
        type="button"
        title="Hướng đường Giồng Lớn — bấm để nhìn từ mặt đường"
        onClick={() => goTo(PRESETS[2].cam)}
        className="absolute left-3 top-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface/90 shadow-sm backdrop-blur hover:border-primary/50"
      >
        <Navigation2
          className="h-5 w-5 fill-primary/30 text-primary transition-transform duration-500"
          // the road lies at -x; screen angle of -x after yaw
          style={{ transform: `rotate(${yawDeg - 90}deg)` }}
        />
        <span className="absolute -bottom-0.5 text-[0.5rem] font-extrabold uppercase tracking-wider text-muted">
          đường
        </span>
      </button>

      <div className="pointer-events-none absolute bottom-3 left-3 hidden items-center xl:flex gap-1.5 rounded-xl bg-surface/80 px-2.5 py-1.5 text-[0.7rem] font-medium text-muted backdrop-blur">
        <MousePointer2 className="h-3.5 w-3.5" />
        Kéo để xoay · Chuột phải / Shift + kéo để di chuyển · Cuộn để phóng to
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// geometry primitives
// ---------------------------------------------------------------------
type Wall = "north" | "south" | "east" | "west";
type BoxTone = Tone | "wall";

/** A flat plane on the ground at height z. */
function Flat({
  x,
  y,
  w,
  h,
  z = 0,
  className,
  style,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  z?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn("absolute", className)}
      style={{ left: x - CX, top: y - CY, width: w, height: h, transform: `translateZ(${z}px)`, ...style }}
    >
      {children}
    </div>
  );
}

// Each wall is a plane stood up on its footprint edge: anchored at the edge's
// midpoint (bottom-centre), rotateX(-90) stands it up facing +y, then rotateZ
// turns it to face outward. Content stays upright when seen from outside.
const WALLS: Record<Wall, { phi: number; len: "w" | "d"; cx: (w: number, d: number) => [number, number] }> = {
  south: { phi: 0, len: "w", cx: (w, d) => [w / 2, d] },
  north: { phi: 180, len: "w", cx: (w) => [w / 2, 0] },
  west: { phi: 90, len: "d", cx: (_w, d) => [0, d / 2] },
  east: { phi: -90, len: "d", cx: (w, d) => [w, d / 2] },
};
// fake lighting from the north-west
const SHADE: Record<Wall, string> = {
  north: "color-mix(in srgb, var(--fp3-wall) 92%, white)",
  west: "color-mix(in srgb, var(--fp3-wall) 96%, white)",
  south: "color-mix(in srgb, var(--fp3-wall) 86%, black)",
  east: "color-mix(in srgb, var(--fp3-wall) 76%, black)",
};

function Box({
  x,
  y,
  w,
  d,
  h,
  tone,
  roof,
  door,
  kiosk,
  code,
  lifted,
  selected,
  dim,
  match,
}: {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  tone: BoxTone;
  roof?: string;
  door?: Wall;
  kiosk?: boolean;
  code?: string;
  lifted?: boolean;
  selected?: boolean;
  dim?: boolean;
  match?: boolean;
}) {
  return (
    <div
      data-fp-room={code}
      className={cn("fp3-box", dim && "fp3-dim", code && "cursor-pointer")}
      style={{
        left: x - CX,
        top: y - CY,
        width: w,
        height: d,
        transform: `translateZ(${lifted ? 9 : 1}px)`,
      }}
    >
      {/* soft contact shadow */}
      <div className="fp3-face fp3-shadow" style={{ inset: -4 }} />
      {(Object.keys(WALLS) as Wall[]).map((side) => {
        const g = WALLS[side];
        const L = g.len === "w" ? w : d;
        const [cx, cy] = g.cx(w, d);
        return (
          <div
            key={side}
            className="fp3-face"
            style={{
              left: cx - L / 2,
              top: cy - h,
              width: L,
              height: h,
              transformOrigin: "50% 100%",
              transform: `rotateZ(${g.phi}deg) rotateX(-90deg)`,
              background: SHADE[side],
            }}
          >
            {door === side && <Door kiosk={kiosk} tone={tone} />}
          </div>
        );
      })}
      <div
        className={cn(
          "fp3-face fp3-roof flex items-center justify-center",
          (tone === "vacant" || tone === "unread") && "fp-hatch",
          match && "fp-match",
          selected && "fp3-roof-selected",
        )}
        style={{ inset: 0, transform: `translateZ(${h}px)`, backgroundColor: roof ?? SHADE.north }}
      >
        {/* the room code, painted on the roof — always visible */}
        {code && (
          <span className="fp3-roof-code">
            {code.startsWith("K") ? (
              code
            ) : (
              <>
                <span className="text-[0.6em] opacity-70">{code.replace(/\d+$/, "")}</span>
                {code.replace(/^\D+/, "")}
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

const DOOR_GLOW: Partial<Record<BoxTone, string>> = {
  paid: "var(--success)",
  under: "var(--warning)",
  unpaid: "var(--danger)",
  power: "var(--primary)",
  people: "var(--info)",
};

/** Subtle door on the outside of a wall. Kiosks get a roller shutter. */
function Door({ kiosk, tone }: { kiosk?: boolean; tone: BoxTone }) {
  const glow = DOOR_GLOW[tone];
  if (kiosk) {
    return (
      <span
        className="fp3-shutter absolute bottom-0 left-1/2 h-[78%] w-[62%] -translate-x-1/2 rounded-t-[3px]"
        style={glow ? { boxShadow: `0 2px 0 0 ${glow} inset` } : undefined}
      />
    );
  }
  return (
    <span
      className="fp3-door absolute bottom-0 left-1/2 h-[72%] w-[24%] -translate-x-1/2 rounded-t-[3px]"
      style={glow ? { boxShadow: `0 2px 0 0 ${glow} inset` } : undefined}
    >
      <span className="absolute right-[18%] top-1/2 h-[3px] w-[3px] rounded-full bg-[var(--fp3-wall)] opacity-80" />
    </span>
  );
}

function roofColor(tone: Tone, v: RoomView | undefined, maxUnits: number): string {
  switch (tone) {
    case "paid":
      return "color-mix(in srgb, var(--success) 52%, var(--surface))";
    case "under":
      return "color-mix(in srgb, var(--warning) 52%, var(--surface))";
    case "unpaid":
      return "color-mix(in srgb, var(--danger) 34%, var(--surface))";
    case "power": {
      const r = Math.min(1, (v?.bill?.units ?? 0) / Math.max(1, maxUnits));
      return `color-mix(in srgb, var(--primary) ${Math.round(10 + 62 * r)}%, var(--surface))`;
    }
    case "people":
      return "color-mix(in srgb, var(--info) 26%, var(--surface))";
    default:
      return "color-mix(in srgb, var(--surface-2) 85%, var(--muted-foreground))";
  }
}

// ---------------------------------------------------------------------
// floating call card — billboarded (always faces the camera) via
// counter-rotation against the camera's yaw/pitch variables
// ---------------------------------------------------------------------
const TONE_DOT: Record<Tone, string> = {
  none: "bg-muted/50",
  vacant: "bg-muted/60",
  paid: "bg-success",
  under: "bg-warning",
  unpaid: "bg-danger",
  power: "bg-primary",
  unread: "bg-muted/60",
  people: "bg-info",
};

function CallCard({
  code,
  v,
  lens,
  tone,
  x,
  y,
  stem,
  detail,
  selected,
  dim,
  onSelect,
}: {
  code: string;
  v: RoomView | undefined;
  lens: Lens;
  tone: Tone;
  x: number;
  y: number;
  stem: number;
  detail: boolean;
  selected: boolean;
  dim: boolean;
  onSelect: (code: string, el: HTMLElement) => void;
}) {
  const debt = (v?.prevOwed ?? 0) > 0;
  const name = v && !v.vacant ? v.name : null;
  return (
    <div
      className="fp3-label"
      style={{ left: x - CX, top: y - CY, ["--fp-h" as string]: `${H + (selected ? 9 : 1)}px`, ["--fp-stem" as string]: `${stem}px` }}
    >
      <div className={cn("fp3-label-inner transition-opacity duration-200", dim && "opacity-20")}>
        <button
          type="button"
          data-fp-room={code}
          aria-label={`Phòng ${code}${name ? ` — ${name}` : ""}`}
          // pointer clicks are resolved by the viewport (to tell a click from a
          // drag); this handles keyboard activation only
          onClick={(e) => e.detail === 0 && onSelect(code, e.currentTarget)}
          className={cn(
            "flex min-w-[4.75rem] max-w-[9rem] flex-col gap-0.5 rounded-xl border bg-surface px-2 py-1.5 text-left shadow-lg transition-all duration-200",
            selected ? "border-primary ring-2 ring-primary/60" : "border-border",
            debt && !selected && "border-warning/70",
          )}
        >
          <span className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[tone])} />
            <span className="text-sm font-extrabold leading-none tracking-tight">{code}</span>
            {debt && <TriangleAlert className="h-3 w-3 shrink-0 text-warning" />}
          </span>
          {detail && (
            <span className="flex min-w-0 items-center gap-1.5">
              {name && <Avatar name={name} photoUrl={v?.photoUrl} size={18} />}
              <span className={cn("truncate text-[0.7rem] font-semibold leading-tight", !name && "italic text-muted")}>
                {name ?? (v?.bill ? "Phòng trống" : "—")}
              </span>
            </span>
          )}
          <Metric v={v} lens={lens} tone={tone} />
        </button>
        <span className={cn("fp3-stem", selected ? "bg-primary" : "bg-[color-mix(in_srgb,var(--muted-foreground)_55%,transparent)]")} />
        <span className={cn("h-2 w-2 rounded-full ring-2 ring-surface", selected ? "bg-primary" : TONE_DOT[tone])} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// surroundings — flat, faint, fading outward
// ---------------------------------------------------------------------
function Surroundings() {
  return (
    <>
      <Flat x={-900} y={-760} w={LEN + 1800} h={WY + 1520} className="fp3-ground" />
      {/* main road along the front */}
      <Flat x={-214} y={-520} w={140} h={WY + 1040} z={0.3} className="fp3-road flex items-center justify-center">
        <span className="fp-label fp-vlabel !text-xs bg-[var(--fp-road)] py-4">Đường Giồng Lớn</span>
      </Flat>
      {/* alley along the even row, meeting the road */}
      <Flat x={-74} y={-70} w={LEN + 420} h={52} z={0.2} className="fp3-alley flex items-center pl-16">
        <span className="fp-label">Hẻm</span>
      </Flat>
      {/* neighbouring lots */}
      <Flat x={30} y={WY + 26} w={LEN - 60} h={240} z={0.1} className="fp-hatch fp3-fade-down rounded-2xl" />
      <Flat x={30} y={-330} w={LEN - 60} h={230} z={0.1} className="fp-hatch fp3-fade-up rounded-2xl" />
    </>
  );
}

function CtlBtn({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
