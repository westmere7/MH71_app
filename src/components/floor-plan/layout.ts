import type { Bill, PaymentStatus, Room, Tenant } from "@/lib/supabase/types";

// =====================================================================
// Physical layout of MH71 (abstracted — not the real compass heading).
//
// One long building, two rows of rooms facing a shared corridor. The FRONT
// (index 0 = kiosks) opens onto the main road (đường Giồng Lớn); the BACK
// (index 12) is closed off by a wall linking P24 and P23. The even row runs
// along the small alley (hẻm) that meets the main road at the front corner.
//
//   desktop (horizontal)              phone (vertical)
//   ┌─ hẻm ──────────────────┐        hẻm │ P24 │   │ P23
//   │ K1 P2 P4 … P24         │            │  …  │   │  …
//   │ ── lối đi ──────── │back│            │ K1  │   │ K2
//   │ K2 P1 P3 … P23         │        ─── đường Giồng Lớn ───
//   đường Giồng Lớn (left)
// =====================================================================

/** front → back, alley side */
export const ALLEY_ROW = ["K1", "P2", "P4", "P6", "P8", "P10", "P12", "P14", "P16", "P18", "P20", "P22", "P24"];
/** front → back, far side */
export const FAR_ROW = ["K2", "P1", "P3", "P5", "P7", "P9", "P11", "P13", "P15", "P17", "P19", "P21", "P23"];

export const DEPTH = ALLEY_ROW.length; // 13 slots from the road to the back wall

export type Orientation = "horizontal" | "vertical";
export type Side = "alley" | "far";

export interface Slot {
  side: Side;
  index: number; // 0 = front (road), DEPTH-1 = back
}

const SLOT_BY_CODE = new Map<string, Slot>();
ALLEY_ROW.forEach((c, i) => SLOT_BY_CODE.set(c, { side: "alley", index: i }));
FAR_ROW.forEach((c, i) => SLOT_BY_CODE.set(c, { side: "far", index: i }));

export function slotOf(code: string): Slot | null {
  return SLOT_BY_CODE.get(code) ?? null;
}

/** Human description of where a room is, as seen walking in from the road. */
export function positionLabel(code: string): string {
  const s = slotOf(code);
  if (!s) return "Ngoài sơ đồ";
  const row = s.side === "alley" ? "Dãy trái · giáp hẻm" : "Dãy phải";
  if (s.index === 0) return `Ki-ốt mặt tiền · ${s.side === "alley" ? "góc hẻm" : "bên phải"}`;
  return `${row} · phòng thứ ${s.index} từ cổng vào`;
}

// ---------------------------------------------------------------------
// The per-room view model the map renders (one per room, current month).
// ---------------------------------------------------------------------
export interface RoomView {
  room: Room;
  bill: Bill | null;
  tenant: Tenant | null;
  name: string | null;
  phone: string | null;
  photoUrl: string | null;
  vacant: boolean;
  /** status as the app shows it (legacy "partial" reads as unpaid) */
  status: PaymentStatus | null;
  paid: boolean;
  underpaid: boolean;
  /** what is still owed THIS month (0 when paid in full / vacant) */
  owed: number;
  /** debt carried from last month by the same person */
  prevOwed: number;
  recorded: boolean; // số điện entered
}

export type Lens = "payment" | "power" | "people";

// combining diacritical marks (U+0300–U+036F), left after NFD decomposition
const MARKS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, "g");

/** Strip Vietnamese diacritics for forgiving search ("phuc" finds "Phúc"). */
export function fold(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(MARKS, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function matchesQuery(v: RoomView, q: string): boolean {
  const f = fold(q);
  if (!f) return true;
  // a bare number ("12") means the room number, not any phone containing 12
  if (/^\d{1,2}$/.test(f)) return v.room.code.replace(/\D/g, "") === f;
  const code = fold(v.room.code);
  if (code === f) return true;
  return (
    fold(v.name).includes(f) ||
    (v.phone ?? "").replace(/\s/g, "").includes(f.replace(/\s/g, "")) ||
    code.includes(f)
  );
}

/** "2n 3t" — compact tenure for the tiny tile. */
export function tenureShort(moveIn: string | null | undefined): string | null {
  if (!moveIn) return null;
  const d = new Date(moveIn);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 1) return "mới";
  if (months < 12) return `${months} th`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y}n ${m}th` : `${y} năm`;
}
