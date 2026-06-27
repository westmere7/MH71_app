"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAYMENT_STATUS, STATUS_CHOICES, statusChoiceOf } from "@/lib/constants";
import type { StatusChoice } from "@/lib/constants";
import type { PaymentStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

// movement (px) past which a press is treated as a scroll, not a tap
const DRAG_THRESHOLD = 10;

export function StatusChip({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const meta = PAYMENT_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        meta.chip,
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
      {meta.short}
    </span>
  );
}

export function StatusMenu({
  status,
  onChoose,
  disabled,
}: {
  status: PaymentStatus;
  onChoose: (c: StatusChoice) => void;
  disabled?: boolean;
}) {
  const meta = PAYMENT_STATUS[status];
  const current = statusChoiceOf(status);
  const [open, setOpen] = React.useState(false);
  const start = React.useRef<{ x: number; y: number } | null>(null);
  const dragged = React.useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY };
    dragged.current = false;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    if (
      Math.abs(e.clientX - start.current.x) > DRAG_THRESHOLD ||
      Math.abs(e.clientY - start.current.y) > DRAG_THRESHOLD
    ) {
      dragged.current = true;
    }
  }
  function handleOpenChange(next: boolean) {
    // a touch-and-drag (scroll) must not open the menu — only a deliberate tap
    if (next && dragged.current) {
      dragged.current = false;
      return;
    }
    setOpen(next);
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        disabled={disabled}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-50",
          meta.chip,
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
        {meta.short}
        <ChevronDown className="h-4 w-4 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {STATUS_CHOICES.map((c) => (
          <DropdownMenuItem
            key={c.value}
            selected={c.value === current}
            onSelect={() => onChoose(c.value)}
          >
            <span className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", c.dot)} />
              {c.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
