import { NextResponse } from "next/server";
import { checkPassword, meterToken, meterCookieOptions, METER_COOKIE } from "@/lib/meter-auth";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!checkPassword(body.password ?? "")) {
    return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(METER_COOKIE, meterToken(), meterCookieOptions());
  return res;
}
