"use client";

import * as React from "react";
import { useSettings } from "@/lib/queries";
import { applyUiScale, UI_SCALE_KEY } from "@/lib/ui-scale";

/**
 * Applies the saved UI scale app-wide. Reads the cached value from localStorage
 * first (instant, no flash) then reconciles with the Supabase setting once it
 * loads. Renders nothing.
 */
export function UiScaleApplier() {
  const { data } = useSettings();

  // instant apply from the last-known value before settings load
  React.useEffect(() => {
    const cached = Number(localStorage.getItem(UI_SCALE_KEY));
    if (cached) applyUiScale(cached);
  }, []);

  // reconcile with the source of truth from Supabase
  const scale = data?.ui_scale;
  React.useEffect(() => {
    if (scale == null) return;
    applyUiScale(scale);
    localStorage.setItem(UI_SCALE_KEY, String(scale));
  }, [scale]);

  return null;
}
