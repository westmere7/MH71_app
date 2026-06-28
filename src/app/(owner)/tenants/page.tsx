"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useMonthCtx } from "@/components/month-provider";
import { useRooms, useCurrentTenants, useAllTenants, useBills } from "@/lib/queries";
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
  const { selectedMonth, settings, isLoading } = useMonthCtx();
  const roomsQ = useRooms();
  const tenantsQ = useCurrentTenants();
  const allTenantsQ = useAllTenants();
  const billsQ = useBills(selectedMonth?.id ?? null);

  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  // single-open accordion: the expanded card stays in focus, the rest dim out
  const [openId, setOpenId] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // leave focus mode on Escape or a click outside the list (but not when a
  // dropdown / dialog is open, or when clicking another card or its popovers)
  React.useEffect(() => {
    if (openId === null) return;
    const overlayOpen = () =>
      !!document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"]');

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !overlayOpen()) setOpenId(null);
    }
    function onDown(e: PointerEvent) {
      const t = e.target as Element | null;
      if (!t || overlayOpen()) return;
      if (listRef.current?.contains(t)) return; // a card handles its own toggle
      if (t.closest('[role="menu"],[role="dialog"],[data-radix-popper-content-wrapper]')) return;
      setOpenId(null);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [openId]);

  const billByRoom = React.useMemo(() => {
    const m = new Map<string, Bill>();
    for (const b of billsQ.data ?? []) m.set(b.room_id, b);
    return m;
  }, [billsQ.data]);

  // every tenant by id (incl. moved-out) — the row's tenant/photo follow the
  // bill's recorded person, not whoever currently occupies the room
  const tenantById = React.useMemo(() => {
    const m = new Map<string, Tenant>();
    for (const t of allTenantsQ.data ?? []) m.set(t.id, t);
    return m;
  }, [allTenantsQ.data]);

  const tenantByRoom = React.useMemo(() => {
    const m = new Map<string, Tenant>();
    for (const t of tenantsQ.data ?? []) m.set(t.room_id, t);
    return m;
  }, [tenantsQ.data]);

  const rooms = roomsQ.data ?? [];
  const paidCount = (billsQ.data ?? []).filter((b) => isPaidStatus(b.payment_status)).length;

  const q = search.trim().toLowerCase();
  const matchesSearch = (room: (typeof rooms)[number]) => {
    if (!q) return true;
    const bill = billByRoom.get(room.id);
    const tenant = tenantByRoom.get(room.id);
    const name = (bill?.tenant_name ?? tenant?.name ?? "").toLowerCase();
    const phone = bill?.tenant_phone ?? tenant?.phone ?? "";
    return room.code.toLowerCase().includes(q) || name.includes(q) || phone.includes(q);
  };

  // rooms matching the search (ignoring the active filter) — used for chip counts
  const searchMatched = rooms.filter(matchesSearch);
  const filterCounts: Record<Filter, number> = {
    all: searchMatched.length,
    due: 0,
    paid: 0,
    vacant: 0,
  };
  for (const room of searchMatched) {
    const st = billByRoom.get(room.id)?.payment_status;
    if (matchesFilter(st, "due")) filterCounts.due++;
    if (matchesFilter(st, "paid")) filterCounts.paid++;
    if (matchesFilter(st, "vacant")) filterCounts.vacant++;
  }

  const rows = searchMatched.filter((room) =>
    matchesFilter(billByRoom.get(room.id)?.payment_status, filter),
  );

  const loading = isLoading || roomsQ.isLoading || billsQ.isLoading;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold tracking-tight">Phòng thuê</h1>
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
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-2 text-muted hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs font-bold tabular-nums",
                  active ? "bg-primary-foreground/20" : "bg-foreground/10",
                )}
              >
                {filterCounts[f.key]}
              </span>
            </button>
          );
        })}
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
        <div ref={listRef} className="flex flex-col gap-2.5">
          {rows.map((room) => {
            const bill = billByRoom.get(room.id) ?? null;
            // the row's tenant is the person on THIS month's bill (by tenant_id,
            // even if since moved out); fall back to the room's current tenant
            const billTenant =
              (bill?.tenant_id ? tenantById.get(bill.tenant_id) : undefined) ??
              tenantByRoom.get(room.id) ??
              null;
            return (
            <TenantRow
              key={room.id}
              room={room}
              bill={bill}
              tenant={billTenant}
              photoUrl={billTenant?.photo_url ?? null}
              month={selectedMonth}
              buildingName={settings?.building_name ?? "MH71"}
              open={openId === room.id}
              onOpenChange={(o) =>
                // opening while another card is focused just exits the focus
                // first (one tap to defocus, another to open this one)
                setOpenId((cur) => (o ? (cur && cur !== room.id ? null : room.id) : null))
              }
              dimmed={openId !== null && openId !== room.id}
            />
            );
          })}
        </div>
      )}
    </div>
  );
}
