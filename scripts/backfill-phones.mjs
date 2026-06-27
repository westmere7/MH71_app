// One-time backfill of month-specific phone numbers from the records PDF into
// bills.tenant_phone. Requires migration 0008 (tenant_phone column) applied.
//
//   node scripts/backfill-phones.mjs          # dry run (no writes)
//   node scripts/backfill-phones.mjs write    # apply
//
// Uses SUPABASE_SERVICE_ROLE_KEY from .env.local and pdftotext on PATH.

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const WRITE = process.argv[2] === "write";
const PDF = "records/MH71_10-2023 to 6-2026 records.pdf";

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

const txt = execSync(`pdftotext -enc UTF-8 -layout "${PDF}" -`, {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const pages = txt.split("\f").filter((p) => /Người thuê/.test(p));

const clean = (s) => s.replace(/�/g, " ").replace(/\s+/g, " ").trim();
const hasLetter = (s) => /[A-Za-zÀ-ỹ]/.test(s);
const isVacant = (s) => /^\(?\s*Trống/i.test(s);
const labelToCode = (l) =>
  /^[KP]/.test(l) ? l.toUpperCase() : Number(l) >= 1 && Number(l) <= 24 ? `P${Number(l)}` : null;
const toPhone = (s) => {
  if (!s) return null;
  const d = s.replace(/\D/g, "");
  return d.length >= 8 ? d : null; // ignore reading numbers / notes
};

function parsePage(page) {
  const lines = page.split(/\r?\n/);
  const toks = (lines.find((l) => l.trim()) || "").match(/\d+/g) || [];
  const month = Number(toks[0]);
  const year = Number(toks.find((t) => /^20\d\d$/.test(t)));
  const phones = {};
  for (const line of lines) {
    const m = line.match(/^\s*(K[12]|P(?:2[0-4]|1[0-9]|[1-9])|2[0-4]|1[0-9]|[1-9])\s+(\S.*)$/);
    if (!m) continue;
    const code = labelToCode(m[1]);
    if (!code) continue;
    const cells = m[2].split(/\s{2,}/);
    const nm = clean(cells[0]);
    if (!nm || !hasLetter(nm) || isVacant(nm)) continue; // no tenant => no phone
    const phone = toPhone(cells[1]);
    if (phone && !(code in phones)) phones[code] = phone;
  }
  return { month, year, phones };
}

const parsed = pages.map(parsePage);

const { data: months } = await sb.from("months").select("id,year,month").order("year").order("month");
const { data: rooms } = await sb.from("rooms").select("id,code");
const { data: bills, error: billErr } = await sb
  .from("bills")
  .select("id,month_id,room_id,tenant_phone");
if (billErr) {
  console.error(`Cannot read bills.tenant_phone — run migration 0008 first.\n${billErr.message}`);
  process.exit(1);
}
// the PDF covers the first N months; any newer months (created after the PDF)
// simply have no page and are skipped.
if (parsed.length > months.length) {
  console.error(`more pages (${parsed.length}) than months (${months.length})`);
  process.exit(1);
}
for (let i = 0; i < parsed.length; i++) {
  if (months[i].year !== parsed[i].year || months[i].month !== parsed[i].month) {
    console.error(
      `ALIGN MISMATCH idx ${i}: db ${months[i].month}/${months[i].year} vs pdf ${parsed[i].month}/${parsed[i].year}`,
    );
    process.exit(1);
  }
}
console.log(`alignment OK (${parsed.length} pages → first ${parsed.length} of ${months.length} months)`);

const roomByCode = new Map(rooms.map((r) => [r.code, r.id]));
const billKey = new Map(bills.map((b) => [`${b.month_id}:${b.room_id}`, b]));
const updates = [];
let skipped = 0;
parsed.forEach((p, i) => {
  const mid = months[i].id;
  for (const [code, phone] of Object.entries(p.phones)) {
    const b = billKey.get(`${mid}:${roomByCode.get(code)}`);
    if (!b) continue;
    if (b.tenant_phone != null) {
      skipped++;
      continue;
    }
    updates.push({ id: b.id, tenant_phone: phone });
  }
});
console.log(`phones to apply: ${updates.length} | skipped (already set): ${skipped}`);
console.log("examples:", updates.slice(0, 4));

if (!WRITE) {
  console.log("\nDRY RUN — pass 'write' to apply");
  process.exit(0);
}
let done = 0;
for (let i = 0; i < updates.length; i += 25) {
  const chunk = updates.slice(i, i + 25);
  await Promise.all(
    chunk.map((u) => sb.from("bills").update({ tenant_phone: u.tenant_phone }).eq("id", u.id)),
  );
  done += chunk.length;
}
console.log(`✅ updated ${done} bills with phones`);
