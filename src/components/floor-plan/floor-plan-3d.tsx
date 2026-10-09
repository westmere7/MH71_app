"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
import { Metric, RoomHoverCard, toneOf, type Tone } from "./floor-plan";
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
// Modelled on the real building (photos): one continuous block of two-level
// rooms (ground floor + loft with a railing walkway), pitched metal roofs
// sloping down to the outer walls, a translucent pitched roof over the shared
// corridor, and a gate with a pediment + sign between the two road-side shops.
const H = 62; // outer (eave) wall height — two levels
const R = 14; // room roof rise: eave → corridor side
const P = 22; // corridor roof peak above the room roofs
const LOFT = 30; // loft walkway level
const SHOP_H = 30; // kiosk shop-front opening height
const GAP = 2; // seam between neighbouring rooms (one continuous block)

// Ground layers sit whole pixels apart (sub-pixel gaps z-fight / flicker at
// shallow angles), and the building stands on top of them all.
const Z_FIELD = 1; // field, neighbours
const Z_STREET = 2; // road, alley path, grass
const Z_COURT = 3; // tiled forecourt
const Z_SLAB = 4; // building slab
const Z_BASE = 5; // floor of the building (corridor, room boxes, gables)
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

  // the view runs from where it starts on the page down to the bottom of the
  // window (not a fixed-height card), so the whole scene has room
  const sizeViewport = React.useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const top = vp.getBoundingClientRect().top + window.scrollY;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    vp.style.height = `${Math.max(30 * rem, window.innerHeight - top - 12)}px`;
  }, []);

  // initial framing
  React.useLayoutEffect(() => {
    sizeViewport();
    cam.current.zoom = fitZoom();
    apply(true);
  }, [apply, fitZoom, sizeViewport]);
  React.useEffect(() => {
    window.addEventListener("resize", sizeViewport);
    // immersive: hide the app footer + bottom padding while the 3D view is up
    // (see html[data-fp3] in globals.css) so the view ends at the window edge
    document.documentElement.dataset.fp3 = "1";
    return () => {
      window.removeEventListener("resize", sizeViewport);
      delete document.documentElement.dataset.fp3;
    };
  }, [sizeViewport]);

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

  // ---- the big detail card: flat, screen-space, never scaled by the
  // perspective. Clicking a room PINS its card (no side sheet); the card's
  // button opens the full sheet. Hovering another room previews its card
  // (hover-only mode). The card follows its roof's on-screen box each frame
  // (the camera may be zooming / auto-rotating underneath).
  const [pinned, setPinned] = React.useState<string | null>(null);
  // a pinned card is always shown — through drags, rotation and zoom — and
  // stays put while hovering other rooms (so its button can be reached); it's
  // hidden only while the full sheet is open. Otherwise hover previews (not
  // during a drag).
  const cardCode = (!selectedCode && pinned) || (!dragging && !showInfo && hovered) || null;
  const [hoverRect, setHoverRect] = React.useState<DOMRect | null>(null);
  React.useEffect(() => {
    if (!cardCode) return;
    let raf = 0;
    let last = "";
    const track = () => {
      raf = requestAnimationFrame(track);
      const roof = viewportRef.current?.querySelector(`.fp3-box[data-fp-room="${cardCode}"] .fp3-roof`);
      if (!roof) return;
      const r = roof.getBoundingClientRect();
      const sig = `${Math.round(r.left)}|${Math.round(r.top)}|${Math.round(r.width)}|${Math.round(r.height)}`;
      if (sig !== last) {
        last = sig;
        setHoverRect(r);
      }
    };
    raf = requestAnimationFrame(track);
    return () => {
      cancelAnimationFrame(raf);
      setHoverRect(null);
    };
  }, [cardCode]);

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
      // the scene moved under a still cursor (no pointerover fires) → re-hit-test
      const under = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-fp-room]");
      setHovered(under?.dataset.fpRoom ?? null);
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
    if (d && d.moved < 4) {
      setPinned(d.code);
      // the full sheet is already open → switch it to the clicked room
      if (selectedCode && d.code && d.el) onSelect(d.code, d.el);
    }
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
    else if (k === "Escape" && pinned) setPinned(null);
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
        "fp3-viewport fp-canvas relative min-h-[30rem] w-full overflow-hidden rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        dragging && "is-dragging",
      )}
    >
      <div ref={worldRef} className="fp3-world">
        <Surroundings />

        {/* building slab + corridor floor */}
        <Flat x={-4} y={-4} w={LEN + 8} h={WY + 8} z={Z_SLAB} className="fp3-slab rounded-sm" />
        <Flat x={0} y={RD} w={LEN} h={CD} z={Z_BASE} className="fp-corridor fp-corridor-h flex items-center justify-center">
          <span className="fp-label bg-[var(--fp-floor)] px-3 !text-[0.7rem]">Lối đi chung</span>
        </Flat>

        {/* tiled forecourt with its trees, between the building and the road */}
        <Flat x={-66} y={-30} w={66} h={WY + 30} z={Z_COURT} className="fp3-court" />
        <Tree x={-46} y={30} />
        <Tree x={-40} y={RD + CD + 12} size={26} />
        <Tree x={-46} y={WY - 30} size={28} />

        {/* corridor: gate + pediment at the road, back gable, translucent roof */}
        <Gable front />
        <Gable />
        <CorridorRoof />

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
            const isSel = selectedCode === code || pinned === code;
            const active = isSel || hovered === code;
            return (
              <React.Fragment key={code}>
                <Box
                  x={x}
                  y={y}
                  w={w}
                  d={d}
                  h={H}
                  rise={R}
                  eave={side === "alley" ? "north" : "south"}
                  tone={tone}
                  roof={roofColor(tone, v, maxUnits)}
                  door={door}
                  shop={kiosk ? (side === "alley" ? "glass" : "grille") : undefined}
                  loft={!kiosk}
                  ends={i === 0 ? ["west"] : i === DEPTH - 1 ? ["east"] : []}
                  code={code}
                  lifted={active}
                  selected={isSel}
                  dim={searching && !match}
                  match={match}
                />
                {showInfo && code !== cardCode && (
                <CallCard
                  code={code}
                  v={v}
                  lens={lens}
                  tone={tone}
                  x={x + w / 2}
                  y={y + d / 2}
                  stem={i % 2 === 0 ? 34 : 70}
                  detail={detail || active || match}
                  selected={isSel}
                  dim={searching && !match}
                  onSelect={(c) => setPinned(c)}
                />
                )}
              </React.Fragment>
            );
          }),
        )}
      </div>

      {/* portal: the viewport's `perspective` would otherwise trap a fixed element */}
      {hoverRect &&
        cardCode &&
        views.get(cardCode) &&
        createPortal(
          <RoomHoverCard
            view={views.get(cardCode)!}
            rect={hoverRect}
            pinned={cardCode === pinned}
            onOpen={(el) => onSelect(cardCode, el)}
            onClose={() => setPinned(null)}
          />,
          document.body,
        )}

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
const NORMAL: Record<Wall, [number, number]> = { south: [0, 1], north: [0, -1], west: [-1, 0], east: [1, 0] };
// fake lighting from the north-west
const SHADE: Record<Wall, string> = {
  north: "color-mix(in srgb, var(--fp3-wall) 92%, white)",
  west: "color-mix(in srgb, var(--fp3-wall) 96%, white)",
  south: "color-mix(in srgb, var(--fp3-wall) 86%, black)",
  east: "color-mix(in srgb, var(--fp3-wall) 76%, black)",
};

/** An upright face standing on a footprint edge (optionally lifted / pushed out). */
function Face({
  side,
  w,
  d,
  height,
  clip,
  lift = 0,
  out = 0,
  className,
  style,
  children,
}: {
  side: Wall;
  w: number;
  d: number;
  height: number;
  clip?: string;
  lift?: number;
  out?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const g = WALLS[side];
  const L = g.len === "w" ? w : d;
  const [cx, cy] = g.cx(w, d);
  const [nx, ny] = NORMAL[side];
  return (
    <div
      className={cn("fp3-face", className)}
      style={{
        left: cx + nx * out - L / 2,
        top: cy + ny * out - height,
        width: L,
        height,
        transformOrigin: "50% 100%",
        transform: `translateZ(${lift}px) rotateZ(${g.phi}deg) rotateX(-90deg)`,
        clipPath: clip,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type Eave = "north" | "south";

/**
 * A room: walls + a roof pitched up from the outer eave to the corridor side.
 * The outer wall has the two-tone band + small high window, the corridor wall
 * the tiled dado + door (and the loft walkway), the end walls are gables.
 * Kiosks (`shop`) get a flat parapet shop front with an awning on the road.
 */
function Box({
  x,
  y,
  w,
  d,
  h,
  rise = 0,
  eave = "north",
  tone,
  roof,
  door,
  shop,
  loft,
  ends = ["west", "east"],
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
  rise?: number;
  eave?: Eave;
  tone: BoxTone;
  roof?: string;
  door?: Wall;
  shop?: "glass" | "grille";
  loft?: boolean;
  /** which end walls (west/east) to build — only the building's ends need them */
  ends?: Wall[];
  code?: string;
  lifted?: boolean;
  selected?: boolean;
  dim?: boolean;
  match?: boolean;
}) {
  const ridge = h + rise;
  const inner: Wall = eave === "north" ? "south" : "north";
  const slope = Math.hypot(d, rise);
  const tilt = (Math.atan2(rise, d) * 180) / Math.PI;
  return (
    <div
      data-fp-room={code}
      className={cn("fp3-box", dim && "fp3-dim", code && "cursor-pointer")}
      style={{
        left: x - CX,
        top: y - CY,
        width: w,
        height: d,
        transform: `translateZ(${Z_BASE + (lifted ? 6 : 0)}px)`,
      }}
    >
      {(Object.keys(WALLS) as Wall[]).filter((side) => side === eave || side === inner || ends.includes(side)).map((side) => {
        const front = !!shop && side === door; // kiosk shop front: flat parapet above the roof
        let height = h;
        let clip: string | undefined;
        let cls = "fp3-wall-end";
        if (side === eave) cls = "fp3-wall-out";
        else if (side === inner) {
          height = ridge;
          cls = "fp3-wall-in";
        } else if (front) height = ridge + 6;
        else {
          // gable end: from the eave up to the corridor side
          height = ridge;
          const eaveLeft = side === "west" ? eave === "north" : eave === "south";
          clip = eaveLeft
            ? `polygon(0 ${rise}px, 100% 0, 100% 100%, 0 100%)`
            : `polygon(0 0, 100% ${rise}px, 100% 100%, 0 100%)`;
        }
        return (
          <Face key={side} side={side} w={w} d={d} height={height} clip={clip} className={cls} style={{ backgroundColor: SHADE[side] }}>
            {side === door && (front ? <ShopFront variant={shop!} tone={tone} /> : <Door tone={tone} />)}
            {side === eave && <span className="fp3-window absolute left-1/2 top-[16%] h-[15%] w-[20%] -translate-x-1/2" />}
          </Face>
        );
      })}
      {loft && <Loft side={inner} w={w} d={d} />}
      {shop && (
        <div
          className="fp3-face fp3-awning"
          style={{
            left: -16,
            top: d * 0.1,
            width: 16,
            height: d * 0.8,
            transformOrigin: "100% 50%",
            transform: `translateZ(${SHOP_H + 3}px) rotateY(-22deg)`,
            backfaceVisibility: "visible",
          }}
        />
      )}
      <div
        className={cn(
          "fp3-face fp3-roof flex items-center justify-center",
          (tone === "vacant" || tone === "unread") && "fp-hatch",
          match && "fp-match",
          selected && "fp3-roof-selected",
        )}
        style={{
          left: 0,
          top: eave === "north" ? 0 : d - slope,
          width: w,
          height: slope,
          transformOrigin: eave === "north" ? "50% 0" : "50% 100%",
          transform: `translateZ(${h}px) rotateX(${eave === "north" ? tilt : -tilt}deg)`,
          backgroundColor: roof ?? SHADE.north,
        }}
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

/** Loft walkway along the corridor: a ledge + a horizontal-bar railing. */
function Loft({ side, w, d }: { side: Wall; w: number; d: number }) {
  const out = 7;
  return (
    <>
      <div
        className="fp3-face fp3-ledge"
        style={{ left: 0, top: side === "south" ? d : -out, width: w, height: out, transform: `translateZ(${LOFT}px)`, backfaceVisibility: "visible" }}
      />
      <Face side={side} w={w} d={d} height={11} lift={LOFT} out={out} className="fp3-rail" style={{ backfaceVisibility: "visible" }} />
    </>
  );
}

const DOOR_GLOW: Partial<Record<BoxTone, string>> = {
  paid: "var(--success)",
  under: "var(--warning)",
  unpaid: "var(--danger)",
  power: "var(--primary)",
  people: "var(--info)",
};

/** Ground-floor door (dark louvered metal) + extinguisher, loft window above. */
function Door({ tone }: { tone: BoxTone }) {
  const glow = DOOR_GLOW[tone];
  return (
    <>
      <span
        className="fp3-door absolute bottom-0 left-[32%] h-[24px] w-[18px] -translate-x-1/2 rounded-t-[2px]"
        style={glow ? { boxShadow: `0 2px 0 0 ${glow} inset` } : undefined}
      />
      <span className="fp3-ext absolute bottom-[10px] left-[32%] ml-[12px] h-[7px] w-[3px]" />
      <span className="fp3-window absolute left-[64%] top-[22%] h-[15%] w-[22%] -translate-x-1/2" />
    </>
  );
}

/** Kiosk shop front on the road: two-tone panels up top, glass / grille below. */
function ShopFront({ variant, tone }: { variant: "glass" | "grille"; tone: BoxTone }) {
  const glow = DOOR_GLOW[tone];
  return (
    <>
      <span className="fp3-panels absolute inset-x-[8%] top-[10%] h-[24%]" />
      <span
        className={cn("absolute bottom-0 left-[10%] right-[10%]", variant === "glass" ? "fp3-glass" : "fp3-grille-green")}
        style={{ height: SHOP_H, ...(glow ? { boxShadow: `0 2px 0 0 ${glow} inset` } : {}) }}
      />
    </>
  );
}

/** Corridor end wall with a pointed pediment: the gate + sign at the road, plain at the back. */
function Gable({ front }: { front?: boolean }) {
  const side: Wall = front ? "west" : "east";
  const FH = H + R + P;
  return (
    <div
      className="fp3-box"
      style={{ left: (front ? 0 : LEN) - CX, top: RD - CY, width: 0, height: CD, transform: `translateZ(${Z_BASE}px)` }}
    >
      <Face
        side={side}
        w={0}
        d={CD}
        height={FH}
        clip={`polygon(0 ${P}px, 50% 0, 100% ${P}px, 100% 100%, 0 100%)`}
        className="fp3-wall-end"
        style={{ backgroundColor: SHADE[side] }}
      >
        {front && (
          <>
            <span className="fp3-sign absolute inset-x-[7%] top-[24px] flex flex-col items-center justify-center">
              <span>Nhà Trọ</span>
              <span className="text-[7.5px]">MỸ HẠNH 71</span>
            </span>
            <span className="fp3-gate absolute bottom-0 left-[7%] right-[7%] h-[42px]" />
          </>
        )}
      </Face>
    </div>
  );
}

/**
 * Translucent pitched roof (clear sheets on steel trusses) over the corridor,
 * built bay by bay: small planes depth-sort reliably, huge ones don't.
 */
function CorridorRoof() {
  const half = CD / 2;
  const s = Math.hypot(half, P);
  const t = (Math.atan2(P, half) * 180) / Math.PI;
  const base = Z_BASE + H + R;
  return (
    <>
      {Array.from({ length: DEPTH }, (_, i) => (
        <React.Fragment key={i}>
          <div
            aria-hidden
            className="fp3-skyroof absolute"
            style={{ left: i * CW - CX, top: RD - CY, width: CW, height: s, transformOrigin: "50% 0", transform: `translateZ(${base}px) rotateX(${t}deg)` }}
          />
          <div
            aria-hidden
            className="fp3-skyroof absolute"
            style={{ left: i * CW - CX, top: RD + CD - s - CY, width: CW, height: s, transformOrigin: "50% 100%", transform: `translateZ(${base}px) rotateX(${-t}deg)` }}
          />
        </React.Fragment>
      ))}
    </>
  );
}

/** A small billboarded tree (always faces the camera). */
function Tree({ x, y, size = 30 }: { x: number; y: number; size?: number }) {
  return (
    <div aria-hidden className="fp3-tree" style={{ left: x - CX, top: y - CY, ["--crown" as string]: `${size}px` }}>
      <div className="fp3-tree-inner">
        <span className="fp3-tree-crown" />
        <span className="fp3-tree-trunk" />
      </div>
    </div>
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
      style={{ left: x - CX, top: y - CY, ["--fp-h" as string]: `${Z_BASE + H + R / 2 + (selected ? 6 : 0)}px`, ["--fp-stem" as string]: `${stem}px` }}
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
// ---------------------------------------------------------------------
// The neighbourhood, from the satellite view + street photos. World coords:
// x = depth from the road (building front at 0, road at -214…-74),
// y = across (alley-side wall at 0, far wall at WY). Plain low blocks that
// fade with distance — context only, never competing with the building.
// ---------------------------------------------------------------------
type Tint = "neutral" | "brown" | "orange" | "green" | "rust" | "slate";
type BlockSpec = {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  roof?: Tint;
  /** wall colour (defaults to a muted grey) */
  wall?: string;
  /** pitched roof, ridge running away from the road (gable ends face the road) */
  gable?: boolean;
  label?: string;
};
const BLOCKS: BlockSpec[] = [
  // ---- same side, east: the fenced garden strip, the brown-roof house set
  // back, then the long dark-grey two-storey building running up to the road
  { x: 300, y: WY + 150, w: 560, d: 300, h: 34, roof: "brown", gable: true },
  { x: -20, y: WY + 480, w: 1220, d: 230, h: 46, wall: "color-mix(in srgb, var(--muted-foreground) 34%, var(--background))" },
  // ---- behind: two long sheds lying across the back
  { x: LEN + 170, y: -140, w: 100, d: 860, h: 38, gable: true },
  { x: LEN + 320, y: -60, w: 100, d: 860, h: 38, gable: true },
  // ---- same side, west, past the wet field + dirt lane: the two-storey
  // blue-white house and the long light-blue single-storey building
  { x: -60, y: -1110, w: 240, d: 200, h: 64, wall: "color-mix(in srgb, #8fb3d9 30%, var(--surface))" },
  { x: 260, y: -1070, w: 760, d: 150, h: 34, wall: "color-mix(in srgb, #8fb3d9 24%, var(--surface))" },
  // ---- across the main road (street view, facing south)
  // drinks stall under a rusty canopy, right opposite
  { x: -300, y: 200, w: 60, d: 220, h: 20, roof: "rust" },
  // single-storey house with its gable to the road + white gate, behind the stall
  { x: -540, y: 180, w: 200, d: 280, h: 34, roof: "slate", gable: true },
  // pink-walled gate house, then the tall grey warehouse (Nhà trọ Xuân Tú side)
  { x: -500, y: 520, w: 160, d: 200, h: 32, wall: "color-mix(in srgb, #e48aa0 30%, var(--surface))" },
  { x: -780, y: 760, w: 420, d: 440, h: 52, label: "Nhà trọ Xuân Tú" },
  { x: -560, y: 1560, w: 300, d: 360, h: 38, label: "VLXD Ngọc Trân" },
  // south-west: row of low corrugated-roof houses and stalls
  { x: -560, y: -380, w: 230, d: 240, h: 30, roof: "rust", gable: true },
  { x: -560, y: -680, w: 230, d: 260, h: 28 },
  // ---- electricity poles along the road (one at the front-left corner)
  { x: -72, y: -40, w: 4, d: 4, h: 100 },
  { x: -72, y: 620, w: 4, d: 4, h: 100 },
  { x: -72, y: -780, w: 4, d: 4, h: 100 },
];

const TINT: Record<Tint, string> = {
  neutral: "color-mix(in srgb, var(--muted-foreground) 24%, var(--surface))",
  brown: "color-mix(in srgb, #8b5a46 40%, var(--surface))",
  orange: "color-mix(in srgb, #c2703d 36%, var(--surface))",
  green: "color-mix(in srgb, #4f9a7d 45%, var(--surface))",
  rust: "color-mix(in srgb, #9a5b3a 40%, var(--surface))",
  slate: "color-mix(in srgb, #5f7a74 42%, var(--surface))",
};

/** A plain neighbouring building: walls + a flat or pitched roof, faded by distance. */
function Block({ x, y, w, d, h, roof = "neutral", wall, gable, label }: BlockSpec) {
  // gap between this block and the building's footprint
  const dx = Math.max(0, -(x + w), x - LEN);
  const dy = Math.max(0, -(y + d), y - WY);
  const opacity = Math.min(0.42, Math.max(0.1, 0.46 - Math.hypot(dx, dy) / 2200));
  // pitched roof: ridge along x, so the slopes fall to the north/south walls
  const G = gable ? Math.min(d * 0.3, 26) : 0;
  const half = d / 2;
  const slope = Math.hypot(half, G);
  const tilt = (Math.atan2(G, half) * 180) / Math.PI;
  return (
    <div
      aria-hidden
      className="fp3-box fp3-ctx pointer-events-none"
      style={{
        left: x - CX,
        top: y - CY,
        width: w,
        height: d,
        transform: `translateZ(${Z_COURT}px)`,
        ["--fp3-ctx-o" as string]: opacity,
        ...(wall ? { ["--fp3-wall" as string]: wall } : {}),
      }}
    >
      {(Object.keys(WALLS) as Wall[]).map((side) => {
        const end = gable && (side === "west" || side === "east");
        return (
          <Face
            key={side}
            side={side}
            w={w}
            d={d}
            height={h + (end ? G : 0)}
            clip={end ? `polygon(0 ${G}px, 50% 0, 100% ${G}px, 100% 100%, 0 100%)` : undefined}
            style={{ backgroundColor: SHADE[side] }}
          />
        );
      })}
      {gable ? (
        <>
          <div
            className="fp3-face"
            style={{ left: 0, top: 0, width: w, height: slope, transformOrigin: "50% 0", transform: `translateZ(${h}px) rotateX(${tilt}deg)`, backgroundColor: TINT[roof] }}
          />
          <div
            className="fp3-face"
            style={{ left: 0, top: d - slope, width: w, height: slope, transformOrigin: "50% 100%", transform: `translateZ(${h}px) rotateX(${-tilt}deg)`, backgroundColor: TINT[roof] }}
          />
        </>
      ) : (
        <div
          className="fp3-face flex items-center justify-center"
          style={{ inset: 0, transform: `translateZ(${h}px)`, backgroundColor: TINT[roof] }}
        >
          {label && <span className="fp-label !text-[0.7rem] !tracking-[0.12em]">{label}</span>}
        </div>
      )}
    </div>
  );
}

function Surroundings() {
  return (
    <>
      <Flat x={-900} y={-760} w={LEN + 1800} h={WY + 1520} className="fp3-ground" />
      {/* main road along the front */}
      <Flat x={-214} y={-1100} w={140} h={WY + 2800} z={Z_STREET} className="fp3-road flex items-center justify-center">
        <span className="fp-label fp-vlabel !text-xs bg-[var(--fp-road)] py-4">Đường Giồng Lớn</span>
      </Flat>
      {/* Đường Hoà Vang, branching off across the road */}
      <Flat x={-1400} y={1420} w={1186} h={80} z={Z_STREET} className="fp3-road-side flex items-center justify-end pr-10">
        <span className="fp-label">Đường Hoà Vang</span>
      </Flat>

      {/* west: concrete path along the wall, grass, the open field with a bare
          patch near the road, and the dirt lane cutting across beyond it */}
      <Flat x={-70} y={-30} w={LEN + 360} h={26} z={Z_STREET} className="fp3-alley flex items-center pl-20">
        <span className="fp-label">Hẻm</span>
      </Flat>
      <Flat x={-70} y={-120} w={LEN + 360} h={90} z={Z_STREET} className="fp3-grass" />
      <Flat x={-60} y={-150} w={900} h={22} z={Z_STREET} className="fp3-water rounded-full" />
      <Flat x={-70} y={-780} w={LEN + 360} h={660} z={Z_FIELD} className="fp3-field" />
      <Flat x={20} y={-520} w={400} h={320} z={Z_STREET} className="fp3-dirt rounded-[40%]" />
      <Flat
        x={-74}
        y={-820}
        w={1600}
        h={40}
        z={Z_STREET}
        className="fp3-lane"
        style={{ transformOrigin: "0 50%", transform: `translateZ(${Z_STREET}px) rotateZ(-7deg)` }}
      />

      {/* east: strip of trees + scrub between MH71 and the neighbours */}
      <Flat x={0} y={WY + 12} w={LEN} h={120} z={Z_FIELD} className="fp3-grass fp3-scrub" />
      <Tree x={220} y={WY + 64} size={34} />
      <Tree x={640} y={WY + 80} size={30} />
      <Tree x={1040} y={WY + 56} size={36} />
      <Tree x={420} y={-860} size={26} />
      <Tree x={980} y={-930} size={30} />

      {BLOCKS.map((b, i) => (
        <Block key={i} {...b} />
      ))}
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
