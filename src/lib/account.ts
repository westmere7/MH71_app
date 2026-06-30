"use client";

import * as React from "react";
import { getSupabaseBrowser } from "./supabase/client";

export type Account = {
  email?: string;
  /** display name to show in the UI (falls back to the email's local part) */
  name: string;
  /** the raw saved display name ("" if never set) */
  displayName: string;
  avatarUrl?: string;
};

type MetaUser = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

/** Best display name: saved name → email local part → generic fallback. */
export function deriveName(email?: string | null, meta?: Record<string, unknown> | null): string {
  const dn = (meta?.display_name ?? meta?.full_name) as string | undefined;
  if (dn && dn.trim()) return dn.trim();
  if (email) return email.split("@")[0];
  return "Tài khoản";
}

function toAccount(user: MetaUser | null | undefined): Account | undefined {
  if (!user) return undefined;
  const meta = user.user_metadata ?? {};
  return {
    email: user.email ?? undefined,
    name: deriveName(user.email, meta),
    displayName: (meta.display_name as string) ?? "",
    avatarUrl: (meta.avatar_url as string) ?? undefined,
  };
}

/**
 * The signed-in account, read from the locally-cached session (no network).
 * Stays fresh after profile edits via auth's USER_UPDATED event.
 */
export function useAccount(): Account | undefined {
  const [account, setAccount] = React.useState<Account>();
  React.useEffect(() => {
    const sb = getSupabaseBrowser();
    let active = true;
    // 1) instant paint from the locally-cached session
    sb.auth.getSession().then(({ data }) => {
      if (active) setAccount(toAccount(data.session?.user));
    });
    // 2) authoritative refresh from the server — the cached session's JWT can
    //    hold stale user_metadata (e.g. a name changed on another device).
    sb.auth.getUser().then(({ data }) => {
      if (active && data.user) setAccount(toAccount(data.user));
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      if (active) setAccount(toAccount(session?.user));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return account;
}
