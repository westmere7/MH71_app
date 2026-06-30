import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

const TONES = {
  brand: "bg-brand/10 text-brand",
  primary: "bg-primary/12 text-primary",
  success: "bg-success-surface text-success",
  warning: "bg-warning-surface text-warning",
  danger: "bg-danger-surface text-danger",
  info: "bg-info-surface text-info",
} as const;

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "primary",
  trend,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof TONES;
  trend?: number | null;
}) {
  return (
    <Card className="border-0 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-muted">{label}</span>
        {Icon && (
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", TONES[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums">{value}</div>
      <div className="mt-1 flex items-center gap-2">
        {sub && <span className="text-sm text-muted">{sub}</span>}
        {trend != null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-sm font-semibold",
              trend >= 0 ? "text-success" : "text-danger",
            )}
          >
            {trend >= 0 ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            {formatPercent(trend)}
          </span>
        )}
      </div>
    </Card>
  );
}
