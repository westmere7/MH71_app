import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

export const METER_COOKIE = "mh71_meter";
const MAX_AGE = 60 * 60 * 12; // 12h

function secret(): string {
  return process.env.METER_COOKIE_SECRET || "mh71-dev-secret";
}

/** Deterministic signed token stored in the (httpOnly) meter cookie. */
export function meterToken(): string {
  return crypto.createHmac("sha256", secret()).update("meter-access-v1").digest("hex");
}

export function checkPassword(pw: string): boolean {
  const expected = process.env.METER_PASSWORD || "mh71";
  return typeof pw === "string" && pw === expected;
}

export async function isMeterAuthed(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(METER_COOKIE)?.value;
  return !!value && value === meterToken();
}

export function meterCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  };
}
