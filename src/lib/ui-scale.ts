// UI scale: scales the whole interface (text, spacing, icons) by setting the
// document root font-size, since the app's Tailwind utilities are rem-based.

export const UI_SCALE_KEY = "mh71.uiScale";
export const UI_SCALE_DEFAULT = 1;

export const UI_SCALES: { value: number; label: string }[] = [
  { value: 0.85, label: "Nhỏ" },
  { value: 0.925, label: "Hơi nhỏ" },
  { value: 1, label: "Mặc định" },
  { value: 1.1, label: "Hơi lớn" },
  { value: 1.25, label: "Lớn" },
  { value: 1.4, label: "Rất lớn" },
];

const MIN = UI_SCALES[0].value;
const MAX = UI_SCALES[UI_SCALES.length - 1].value;

export function clampScale(s: number | null | undefined): number {
  if (s == null || Number.isNaN(s)) return UI_SCALE_DEFAULT;
  return Math.min(MAX, Math.max(MIN, s));
}

/** Apply the scale by setting the root font-size as a percentage of the browser base. */
export function applyUiScale(scale: number | null | undefined): void {
  if (typeof document === "undefined") return;
  const pct = Math.round(clampScale(scale) * 100);
  document.documentElement.style.fontSize = `${pct}%`;
}
