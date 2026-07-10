"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardTitle } from "./card";
import { Collapsible, CollapsibleContent } from "./collapsible";
import { cn } from "@/lib/utils";

/** A Card whose body collapses behind a clickable header (collapsed by default). */
export function CollapsibleCard({
  title,
  icon: Icon,
  defaultOpen = false,
  contentClassName,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 p-5 text-left"
        >
          {Icon && <Icon className="h-5 w-5 shrink-0 text-primary" />}
          <CardTitle>{title}</CardTitle>
          <ChevronDown
            className={cn(
              "ml-auto h-5 w-5 shrink-0 text-muted transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        <CollapsibleContent>
          <CardContent className={cn("pt-0", contentClassName)}>{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
