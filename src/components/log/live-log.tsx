"use client";

import * as React from "react";
import { useAuditLog, useRooms } from "@/lib/queries";
import { formatDateTimeFull } from "@/lib/format";
import { TABLE_LABEL, OP_LABEL, actorLabel, identityOf, changedFields } from "@/lib/audit-format";
import { cn } from "@/lib/utils";
import type { AuditRow, AuditOp, Room } from "@/lib/supabase/types";

// Always-dark, spreadsheet-style. Op shown as subtle colored text (no badges).
const OP_TEXT: Record<AuditOp, string> = {
  INSERT: "text-emerald-400",
  UPDATE: "text-sky-400",
  DELETE: "text-rose-400",
};

function changeStr(e: AuditRow): string {
  const c = changedFields(e);
  if (!c.length) return "—";
  return c.map((x) => `${x.label}: ${x.from}→${x.to}`).join("  ·  ");
}

export function LiveLog() {
  const [limit, setLimit] = React.useState(200);
  const q = useAuditLog(limit, true, 2000); // live: poll every 2s + on focus
  const rooms = useRooms().data ?? [];
  const entries = q.data ?? [];

  const roomCode = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rooms as Room[]) m.set(r.id, r.code);
    return m;
  }, [rooms]);

  return (
    <div className="min-h-screen w-full bg-[#0b1120] text-[#cbd5e1]">
      <div className="flex items-center justify-between gap-3 border-b border-[#1e293b] px-3 py-2 text-[#e2e8f0]">
        <span className="text-sm font-bold">Nhật ký thay đổi — MH71</span>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#64748b]">{entries.length} dòng</span>
          <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Trực tiếp
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#131c31] text-[#94a3b8]">
              <Th>Thời gian</Th>
              <Th>Thao tác</Th>
              <Th>Bảng</Th>
              <Th>Đối tượng</Th>
              <Th className="w-full">Thay đổi</Th>
              <Th>Người</Th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr
                key={e.id}
                className={cn(
                  "transition-colors hover:bg-[#1b2740]",
                  i % 2 ? "bg-[#0e1729]" : "bg-[#0b1120]",
                )}
              >
                <Td className="whitespace-nowrap tabular-nums text-[#94a3b8]">
                  {formatDateTimeFull(e.at)}
                </Td>
                <Td className={cn("whitespace-nowrap font-semibold", OP_TEXT[e.op])}>
                  {OP_LABEL[e.op]}
                </Td>
                <Td className="whitespace-nowrap">{TABLE_LABEL[e.table_name] ?? e.table_name}</Td>
                <Td className="whitespace-nowrap text-[#e2e8f0]">
                  {identityOf(e, roomCode) || "—"}
                </Td>
                <Td className="text-[#94a3b8]">{changeStr(e)}</Td>
                <Td className="whitespace-nowrap text-[#64748b]">{actorLabel(e.actor)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {q.isLoading && <p className="py-6 text-center text-xs text-[#64748b]">Đang tải…</p>}
      {!q.isLoading && entries.length === 0 && (
        <p className="py-6 text-center text-xs text-[#64748b]">Chưa có thay đổi nào được ghi nhận.</p>
      )}
      {entries.length >= limit && (
        <div className="flex justify-center py-3">
          <button
            type="button"
            onClick={() => setLimit((l) => l + 200)}
            className="rounded-md border border-[#1e293b] px-3 py-1.5 text-xs font-semibold text-[#94a3b8] hover:bg-[#131c31]"
          >
            Tải thêm
          </button>
        </div>
      )}
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-[#1e293b] px-2.5 py-1.5 text-left font-semibold uppercase tracking-wide",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-[#1a2438] px-2.5 py-1 align-top", className)}>{children}</td>
  );
}
