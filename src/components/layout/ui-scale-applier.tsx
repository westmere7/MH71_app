"use client";

import * as React from "react";
import { applyUiScale, getDeviceUiScale } from "@/lib/ui-scale";

/**
 * Applies the saved UI scale for the local device from localStorage.
 * Does NOT sync across devices to allow per-device font sizes (e.g. phone vs desktop).
 */
export function UiScaleApplier() {
  React.useEffect(() => {
    applyUiScale(getDeviceUiScale());
  }, []);

  return null;
}
