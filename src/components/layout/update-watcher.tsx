"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Detects a new deployment while a tab is open and GATES the whole app until
 * the user reloads. Breaking their current operation is acceptable — they're
 * never mid-anything long, and running a stale bundle is worse.
 *
 * - Records the build version at boot; re-checks on focus / tab-visible /
 *   pageshow (bfcache restore) and a 60s foreground poll.
 * - When a new version appears: shows a full-screen blocking overlay with a
 *   "Tải lại" button. If they instead switch away and come back, it reloads
 *   automatically. Mounted in AppShell → owner app only (not /dien).
 */
export function UpdateWatcher() {
  const booted = React.useRef<string | null>(null);
  const pending = React.useRef(false);
  const [show, setShow] = React.useState(false);

  const check = React.useCallback(async () => {
    if (pending.current) return; // already know an update is waiting
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const { v } = (await res.json()) as { v?: string };
      if (!v) return;
      if (booted.current === null) {
        booted.current = v; // first load establishes the baseline
        return;
      }
      if (v !== booted.current) {
        pending.current = true;
        setShow(true);
      }
    } catch {
      /* offline / transient — ignore */
    }
  }, []);

  React.useEffect(() => {
    check();
    // "Came back to the app" is the key signal on mobile (background timers are
    // frozen while hidden). If an update is already waiting, just reload.
    const onReturn = () => {
      if (document.visibilityState !== "visible") return;
      if (pending.current) window.location.reload();
      else check();
    };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("pageshow", onReturn);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") check();
    }, 60 * 1000);
    return () => {
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("pageshow", onReturn);
      window.clearInterval(id);
    };
  }, [check]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 p-6 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-2xl border border-border bg-surface p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <RefreshCw className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold">Đã có bản cập nhật mới</h2>
        <p className="mt-1 text-sm text-muted">Tải lại để tiếp tục với phiên bản mới nhất.</p>
        <Button size="lg" className="mt-4 w-full" onClick={() => window.location.reload()}>
          <RefreshCw className="h-5 w-5" />
          Tải lại ngay
        </Button>
      </div>
    </div>
  );
}
