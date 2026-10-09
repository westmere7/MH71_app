"use client";

import * as React from "react";

// Per-device preferences (localStorage), shared live across components:
// writing one notifies every subscriber in this tab, and other tabs via the
// native "storage" event.

const SHOW_FLOOR_PLAN_KEY = "mh71.showFloorPlan";
const CHANGE_EVENT = "mh71:device-prefs";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(CHANGE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CHANGE_EVENT, cb);
  };
}

function readShowFloorPlan(): boolean {
  try {
    return localStorage.getItem(SHOW_FLOOR_PLAN_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Show the experimental "Sơ đồ" tab on this device (off by default).
 * `null` until the client has read storage (server render / hydration).
 */
export function useShowFloorPlan(): boolean | null {
  return React.useSyncExternalStore(subscribe, readShowFloorPlan, () => null);
}

export function setShowFloorPlan(on: boolean) {
  try {
    localStorage.setItem(SHOW_FLOOR_PLAN_KEY, on ? "1" : "0");
  } catch {
    /* storage unavailable — nothing to persist */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
