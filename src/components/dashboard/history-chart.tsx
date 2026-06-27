"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatVND, formatVNDShort } from "@/lib/format";

export interface HistoryPoint {
  label: string;
  doanhthu: number;
  loinhuan: number;
}

export function HistoryChart({ data }: { data: HistoryPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "var(--color-muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
          />
          <YAxis
            width={48}
            tick={{ fontSize: 12, fill: "var(--color-muted)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatVNDShort(v as number)}
          />
          <Tooltip
            formatter={(value, name) =>
              [formatVND(Number(value)), String(name ?? "")] as [string, string]
            }
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              color: "var(--color-foreground)",
              fontSize: 13,
            }}
            labelStyle={{ color: "var(--color-foreground)", fontWeight: 700 }}
          />
          <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
          <Bar
            dataKey="doanhthu"
            name="Doanh thu"
            fill="var(--color-primary)"
            radius={[6, 6, 0, 0]}
            maxBarSize={44}
          />
          <Line
            dataKey="loinhuan"
            name="Lợi nhuận"
            type="monotone"
            stroke="var(--color-success)"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
