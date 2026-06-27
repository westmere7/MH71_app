import { NextResponse } from "next/server";
import { isMeterAuthed } from "@/lib/meter-auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  if (!(await isMeterAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { billId?: string; reading_new?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!body.billId) return NextResponse.json({ error: "missing_bill" }, { status: 400 });

  const reading =
    body.reading_new === null || body.reading_new === undefined || Number.isNaN(body.reading_new)
      ? null
      : Number(body.reading_new);

  if (reading !== null && reading < 0) {
    return NextResponse.json({ error: "negative" }, { status: 400 });
  }

  const sb = createServiceClient();
  // service role write restricted by this handler to the reading_new column only
  const { error } = await sb
    .from("bills")
    .update({ reading_new: reading })
    .eq("id", body.billId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
