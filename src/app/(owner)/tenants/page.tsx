"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useMonthCtx } from "@/components/month-provider";
import { useRooms, useCurrentTenants, useBills, useAllBills } from "@/lib/queries";
import { TenantRow } from "@/components/tenants/tenant-row";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { isPaidStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Bill, PaymentStatus, Tenant } from "@/lib/supabase/types";

type Filter = "all" | "due" | "paid" | "vacant";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "due", label: "Chưa thu" },
  { key: "paid", label: "Đã thu" },
  { key: "vacant", label: "Trống" },
];

function matchesFilter(status: PaymentStatus | undefined, f: Filter): boolean {
  if (f === "all") return true;
  if (!status) return f === "vacant";
  if (f === "paid") return isPaidStatus(status);
  if (f === "due") return status === "unpaid";
  if (f === "vacant") return status === "vacant";
  return true;
}

export default function TenantsPage() {
  const { selectedMonth, settings, months, isLoading } = useMonthCtx();
  const roomsQ = useRooms();
  const tenantsQ = useCurrentTenants();
  const billsQ = useBills(selectedMonth?.id ?? null);
  const allBillsQ = useAllBills();

  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");

  // earliest month each tenant name appears in (for tenancy duration when there's
  // no "ngày vào ở"). Keyed by lowercased name -> year*12 + month.
  const nameStart = React.useMemo(() => {
    const monthOf = new Map(months.map((m) => [m.id, m.year * 12 + m.month]));
    const map = new Map<string, number>();
    for (const b of allBillsQ.data ?? []) {
      if (!b.tenant_name) continue;
      const idx = monthOf.get(b.month_id);
      if (idx == null) continue;
      const key = b.tenant_name.trim().toLowerCase();
      const cur = map.get(key);
      if (cur == null || idx < cur) map.set(key, idx);
    }
    return map;
  }, [allBillsQ.data, months]);

  const tenancyLabel = React.useCallback(
    (tenant: Tenant | null): string | null => {
      if (!tenant || !selectedMonth) return null;
      let startIdx: number | undefined;
      if (tenant.move_in_date) {
        const [y, m] = tenant.move_in_date.split("-").map(Number);
        if (y && m) startIdx = y * 12 + m;
      } else {
        startIdx = nameStart.get(tenant.name.trim().toLowerCase());
      }
      if (startIdx == null) return null;
      const asOf = selectedMonth.year * 12 + selectedMonth.month;
      const n = Math.max(asOf - startIdx, 0);
      const sm = ((startIdx - 1) % 12) + 1;
      const sy = String(Math.floor((startIdx - 1) / 12)).slice(2);
      const start = `T${sm}/${sy}`;
      return n <= 0 ? `mới vào (${start})` : `vào ${start} • ${n} tháng`;
    },
    [nameStart, selectedMonth],
  );

  const billByRoom = React.useMemo(() => {
    const m = new Map<string, Bill>();
    for (const b of billsQ.data ?? []) m.set(b.room_id, b);
    return m;
  }, [billsQ.data]);

  const tenantByRoom = React.useMemo(() => {
    const m = new Map<string, Tenant>();
    for (const t of tenantsQ.data ?? []) m.set(t.room_id, t);
    return m;
  }, [tenantsQ.data]);

  const rooms = roomsQ.data ?? [];
  const paidCount = (billsQ.data ?? []).filter((b) => isPaidStatus(b.payment_status)).length;

  const rows = rooms.filter((room) => {
    const bill = billByRoom.get(room.id);
    const tenant = tenantByRoom.get(room.id);
    if (!matchesFilter(bill?.payment_status, filter)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      room.code.toLowerCase().includes(q) ||
      (tenant?.name ?? "").toLowerCase().includes(q) ||
      (tenant?.phone ?? "").includes(q)
    );
  });

  const loading = isLoading || roomsQ.isLoading || billsQ.isLoading;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold tracking-tight">Phòng &amp; Khách thuê</h1>
        {selectedMonth && (
          <span className="text-sm font-semibold text-muted">
            Đã thu {paidCount}/{rooms.length} phòng
          </span>
        )}
      </div>

      {/* search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên, phòng, SĐT…"
          className="pl-10"
        />
      </div>

      {/* filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-surface-2 text-muted hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px]" />
          ))}
        </div>
      ) : !selectedMonth ? (
        <Card className="mt-4">
          <CardContent className="p-8 text-center text-muted">
            Chưa có dữ liệu tháng. Vào Cài đặt để tạo tháng mới.
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="p-8 text-center text-muted">
            Không tìm thấy phòng nào phù hợp.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((room) => (
            <TenantRow
              key={room.id}
              room={room}
              bill={billByRoom.get(room.id) ?? null}
              tenant={tenantByRoom.get(room.id) ?? null}
              month={selectedMonth}
              buildingName={settings?.building_name ?? "MH71"}
              tenancyLabel={tenancyLabel(tenantByRoom.get(room.id) ?? null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
