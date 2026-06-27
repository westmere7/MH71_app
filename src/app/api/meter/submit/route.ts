import { NextResponse } from "next/server";
import { isMeterAuthed } from "@/lib/meter-auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  if (!(await isMeterAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { monthId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.monthId) return NextResponse.json({ error: "missing_month" }, { status: 400 });

  const sb = createServiceClient();

  // guard: a note photo is required, and no reading may be below its số cũ
  const { data: month } = await sb
    .from("months")
    .select("meter_note_photo_url")
    .eq("id", body.monthId)
    .single();
  if (!month?.meter_note_photo_url) {
    return NextResponse.json({ error: "photo_required" }, { status: 400 });
  }
  const { data: bills } = await sb
    .from("bills")
    .select("reading_old, reading_new")
    .eq("month_id", body.monthId);
  const billRows = (bills ?? []) as { reading_old: number; reading_new: number | null }[];
  // every room must have a reading, and none may be below its số cũ
  const hasEmpty = billRows.some((b) => b.reading_new == null);
  if (hasEmpty) {
    return NextResponse.json({ error: "incomplete" }, { status: 400 });
  }
  const hasInvalid = billRows.some((b) => b.reading_new != null && b.reading_new < b.reading_old);
  if (hasInvalid) {
    return NextResponse.json({ error: "invalid_reading" }, { status: 400 });
  }

  // record completion + timestamp; gracefully fall back if 0006 isn't applied yet
  let { error } = await sb
    .from("months")
    .update({ meter_status: "xong", meter_filled_at: new Date().toISOString() })
    .eq("id", body.monthId);
  if (error && /meter_filled_at/i.test(error.message ?? "")) {
    ({ error } = await sb.from("months").update({ meter_status: "xong" }).eq("id", body.monthId));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
