// Manager-page test helper. Puts a month into a "finished" state so the meter
// page (/dien) shows the UPDATE (revising) flow, or resets it back to a fresh
// "needs entry" state.
//
//   node scripts/meter-test.mjs finish [YYYY-M]   # default: latest month
//   node scripts/meter-test.mjs reset  [YYYY-M]
//   node scripts/meter-test.mjs status [YYYY-M]
//
// Uses SUPABASE_SERVICE_ROLE_KEY from .env.local — writes live data. Intended
// for the July 2026 test month only.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const action = (process.argv[2] || "status").toLowerCase();
const monthArg = process.argv[3]; // "YYYY-M"

const { data: months } = await sb
  .from("months")
  .select("*")
  .order("year", { ascending: false })
  .order("month", { ascending: false });

let month;
if (monthArg) {
  const [y, m] = monthArg.split("-").map(Number);
  month = months.find((x) => x.year === y && x.month === m);
} else {
  month = months[0];
}
if (!month) {
  console.error("Month not found:", monthArg ?? "(latest)");
  process.exit(1);
}

const tag = `Tháng ${month.month}/${month.year} (id=${month.id})`;

async function showStatus() {
  const fresh = (await sb.from("months").select("*").eq("id", month.id).single()).data;
  const { data: bills } = await sb
    .from("bills")
    .select("reading_old, reading_new")
    .eq("month_id", month.id);
  const filled = bills.filter((b) => b.reading_new != null).length;
  console.log(`${tag}`);
  console.log(`  meter_status      : ${JSON.stringify(fresh.meter_status)}`);
  console.log(`  meter_note_photo  : ${fresh.meter_note_photo_url ?? "(none)"}`);
  console.log(`  meter_filled_at   : ${fresh.meter_filled_at ?? "(none)"}`);
  console.log(`  bills filled      : ${filled}/${bills.length}`);
  console.log(
    `  → manager page will show: ${fresh.meter_status === "xong" ? "UPDATE (revising) flow" : "NEW submission flow"}`,
  );
}

async function uploadPlaceholderPhoto() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360">
  <rect width="600" height="360" fill="#0e1726"/>
  <text x="50%" y="44%" fill="#22d3ee" font-family="sans-serif" font-size="34" font-weight="bold" text-anchor="middle">Ảnh thử nghiệm</text>
  <text x="50%" y="60%" fill="#94a3b8" font-family="sans-serif" font-size="22" text-anchor="middle">Giấy ghi số điện — ${tag}</text>
</svg>`;
  const path = `${month.id}/note-test.svg`;
  const { error } = await sb.storage
    .from("meter-notes")
    .upload(path, Buffer.from(svg), { contentType: "image/svg+xml", upsert: true });
  if (error) throw error;
  return sb.storage.from("meter-notes").getPublicUrl(path).data.publicUrl;
}

if (action === "status") {
  await showStatus();
  process.exit(0);
}

if (action === "finish") {
  const { data: bills } = await sb
    .from("bills")
    .select("id, reading_old")
    .eq("month_id", month.id);

  // give each room a realistic new reading above its số cũ
  await Promise.all(
    bills.map((b, i) =>
      sb
        .from("bills")
        .update({ reading_new: b.reading_old + 30 + ((i * 17) % 140) })
        .eq("id", b.id),
    ),
  );

  const photoUrl = await uploadPlaceholderPhoto();

  let { error } = await sb
    .from("months")
    .update({
      meter_status: "xong",
      meter_filled_at: new Date().toISOString(),
      meter_note_photo_url: photoUrl,
    })
    .eq("id", month.id);
  if (error && /meter_filled_at/i.test(error.message ?? "")) {
    ({ error } = await sb
      .from("months")
      .update({ meter_status: "xong", meter_note_photo_url: photoUrl })
      .eq("id", month.id));
  }
  if (error) throw error;

  console.log(`✅ Marked ${tag} as FINISHED with sample readings + a test photo.\n`);
  await showStatus();
  console.log("\nOpen /dien (password mh71) to see the UPDATE flow.");
  process.exit(0);
}

if (action === "reset") {
  await sb.from("bills").update({ reading_new: null }).eq("month_id", month.id);
  let { error } = await sb
    .from("months")
    .update({ meter_status: "chua", meter_filled_at: null, meter_note_photo_url: null })
    .eq("id", month.id);
  if (error && /meter_filled_at/i.test(error.message ?? "")) {
    ({ error } = await sb
      .from("months")
      .update({ meter_status: "chua", meter_note_photo_url: null })
      .eq("id", month.id));
  }
  if (error) throw error;

  console.log(`↩️  Reset ${tag} back to fresh (needs entry).\n`);
  await showStatus();
  process.exit(0);
}

console.error(`Unknown action: ${action}. Use finish | reset | status.`);
process.exit(1);
