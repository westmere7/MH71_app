import { NextResponse } from "next/server";
import { isMeterAuthed } from "@/lib/meter-auth";
import { createServiceClient } from "@/lib/supabase/service";

interface SubmitBody {
  monthId?: string;
  notePhotoUrl?: string | null;
  readings?: { billId: string; reading_new: number | null }[];
}

// Commits a whole month in one go: writes every room's reading, sets the note
// photo, and marks the month finished. This is the ONLY place the manager's
// edits are persisted — nothing is saved before this is called.
export async function POST(request: Request) {
  if (!(await isMeterAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.monthId) return NextResponse.json({ error: "missing_month" }, { status: 400 });
  if (!body.notePhotoUrl) return NextResponse.json({ error: "photo_required" }, { status: 400 });
  if (!Array.isArray(body.readings)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const sb = createServiceClient();
  const readingById = new Map(body.readings.map((r) => [r.billId, r.reading_new]));

  // validate against the real số cũ for every bill in the month
  const { data: bills } = await sb
    .from("bills")
    .select("id, reading_old")
    .eq("month_id", body.monthId);
  const billRows = (bills ?? []) as { id: string; reading_old: number }[];
  if (billRows.length === 0) {
    return NextResponse.json({ error: "no_bills" }, { status: 400 });
  }
  for (const b of billRows) {
    const r = readingById.get(b.id);
    if (r == null || Number.isNaN(Number(r))) {
      return NextResponse.json({ error: "incomplete" }, { status: 400 });
    }
    if (Number(r) < b.reading_old) {
      return NextResponse.json({ error: "invalid_reading" }, { status: 400 });
    }
  }

  // write every reading
  const writes = await Promise.all(
    billRows.map((b) =>
      sb.from("bills").update({ reading_new: Number(readingById.get(b.id)) }).eq("id", b.id),
    ),
  );
  const writeErr = writes.find((w) => w.error);
  if (writeErr?.error) {
    return NextResponse.json({ error: writeErr.error.message }, { status: 500 });
  }

  // finalize the month: note photo + completion + timestamp.
  // gracefully fall back if migration 0006 (meter_filled_at) isn't applied yet.
  let { error } = await sb
    .from("months")
    .update({
      meter_note_photo_url: body.notePhotoUrl,
      meter_status: "xong",
      meter_filled_at: new Date().toISOString(),
    })
    .eq("id", body.monthId);
  if (error && /meter_filled_at/i.test(error.message ?? "")) {
    ({ error } = await sb
      .from("months")
      .update({ meter_note_photo_url: body.notePhotoUrl, meter_status: "xong" })
      .eq("id", body.monthId));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
