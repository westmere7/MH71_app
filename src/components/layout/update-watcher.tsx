"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

/**
 * Detects a new deployment while a tab is open and nudges a reload.
 * - Records the build version at boot, re-checks on focus / tab-visible / a
 *   light interval.
 * - On a new version: shows a persistent "Tải lại" toast AND hard-reloads at
 *   the next route change (a safe moment — the user isn't mid-form on the page
 *   they just left), so the fresh bundle always loads without losing work.
 * Mounted in AppShell → owner app only (not /dien).
 */
export function UpdateWatcher() {
  const pathname = usePathname();
  const booted = React.useRef<string | null>(null);
  const stale = React.useRef(false);

  const check = React.useCallback(async () => {
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const { v } = (await res.json()) as { v?: string };
      if (!v) return;
      if (booted.current === null) {
        booted.current = v; // first load establishes the baseline
        return;
      }
      if (v !== booted.current && !stale.current) {
        stale.current = true;
        toast("Đã có bản cập nhật mới", {
          description: "Tải lại để dùng phiên bản mới nhất.",
          duration: Infinity,
          action: { label: "Tải lại", onClick: () => window.location.reload() },
        });
      }
    } catch {
      /* offline / transient — ignore */
    }
  }, []);

  React.useEffect(() => {
    check();
    // Returning to the app is the key signal on mobile (background timers are
    // frozen while the tab is hidden / screen is off) — and it's the only
    // moment a popup is actually visible. Cover every "came back" event.
    const onFocus = () => check();
    const onVis = () => document.visibilityState === "visible" && check();
    // pageshow fires on restore from the mobile back-forward cache (bfcache)
    const onPageShow = () => check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onPageShow);
    // while actively foreground, poll faster so it also pops without leaving
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") check();
    }, 60 * 1000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onPageShow);
      window.clearInterval(id);
    };
  }, [check]);

  // once an update is pending, reload at the next navigation
  const firstNav = React.useRef(true);
  React.useEffect(() => {
    if (firstNav.current) {
      firstNav.current = false;
      return;
    }
    if (stale.current) window.location.reload();
  }, [pathname]);

  return null;
}
