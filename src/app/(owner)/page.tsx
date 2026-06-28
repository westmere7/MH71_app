"use client";

import * as React from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { useMonthCtx } from "@/components/month-provider";
import { useRooms, useBills, useCurrentTenants, useAllTenants } from "@/lib/queries";
import { TenantRow } from "@/components/tenants/tenant-row";
import { StatusChip } from "@/components/tenants/status-menu";
import { isPaidStatus } from "@/lib/constants";
import { formatVND, formatNumber, formatDateTimeLong, monthLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Bill, Tenant } from "@/lib/supabase/types";

// Read-only-at-a-glance overview (kiosk friendly). Tapping a row opens the full
// editable tenant card in a dialog.
export default function OverviewPage() {
  const { selectedMonth, settings, isLoading } = useMonthCtx();
  const roomsQ = useRooms();
  const billsQ = useBills(selectedMonth?.id ?? null);
  const tenantsQ = useCurrentTenants();
  const allTenantsQ = useAllTenants();

  const [openRoomId, setOpenRoomId] = React.useState<string | null>(null);

  const rooms = React.useMemo(
    () => [...(roomsQ.data ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [roomsQ.data],
  );
  const billByRoom = React.useMemo(() => {
    const m = new Map<string, Bill>();
    for (const b of billsQ.data ?? []) m.set(b.room_id, b);
    return m;
  }, [billsQ.data]);
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

  // the row's tenant = the person on the bill (by tenant_id), else current tenant
  const tenantOf = React.useCallback(
    (roomId: string, bill: Bill | null | undefined) =>
      (bill?.tenant_id ? tenantById.get(bill.tenant_id) : undefined) ??
      tenantByRoom.get(roomId) ??
      null,
    [tenantById, tenantByRoom],
  );

  const bills = billsQ.data ?? [];
  const sum = (f: (b: Bill) => number) => bills.reduce((a, b) => a + (f(b) || 0), 0);
  const totals = {
    units: sum((b) => b.units),
    elec: sum((b) => b.electricity_amount),
    room: sum((b) => b.room_fee),
    trash: sum((b) => b.trash_fee),
    grand: sum((b) => b.total),
    paid: bills.filter((b) => isPaidStatus(b.payment_status)).length,
  };

  const loading = isLoading || roomsQ.isLoading || billsQ.isLoading;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-[70vh] w-full rounded-2xl" />
      </div>
    );
  }
  if (!selectedMonth) {
    return (
      <Card className="mx-auto mt-10 max-w-md">
        <CardContent className="p-8 text-center text-muted">
          Chưa có dữ liệu tháng. Vào Cài đặt để tạo tháng mới.
        </CardContent>
      </Card>
    );
  }

  const cell = "whitespace-nowrap px-3 py-2.5 sm:px-5 sm:py-3";
  const num = cn(cell, "text-right tabular-nums");
  const txt = cn(cell, "text-left");
  const th = "whitespace-nowrap px-3 py-3 font-semibold sm:px-5";
  // pinned room column: solid bg so scrolled content doesn't show through
  const stickyCol = "sticky left-0 bg-surface";

  const openRoom = openRoomId ? rooms.find((r) => r.id === openRoomId) : null;
  const openBill = openRoom ? billByRoom.get(openRoom.id) ?? null : null;
  const openTenant = openRoom ? tenantOf(openRoom.id, openBill) : null;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-xl font-extrabold tracking-tight">
            Tổng quan — {monthLabel(selectedMonth.year, selectedMonth.month)}
          </h1>
          <span className="text-sm font-semibold text-muted">
            Đã thu {totals.paid}/{rooms.length} phòng
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted sm:inline">
            Bấm một dòng để sửa, hoặc mở
          </span>
          <Link href="/tenants">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4" />
              Quản lý
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-h-[calc(100dvh-11rem)] w-full overflow-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[760px] text-xs sm:text-sm">
          <thead className="sticky top-0 z-20 bg-surface-2 text-xs text-muted">
            <tr>
              <th className={cn(th, "sticky left-0 z-30 bg-surface-2 text-left")}>#</th>
              <th className={cn(th, "text-left")}>Người thuê</th>
              <th className={cn(th, "text-left")}>SĐT</th>
              <th className={cn(th, "text-right")}>Số điện</th>
              <th className={cn(th, "text-right")}>Tiền điện</th>
              <th className={cn(th, "text-right")}>Tiền phòng</th>
              <th className={cn(th, "text-right")}>Tiền rác</th>
              <th className={cn(th, "text-right")}>Tổng</th>
              <th className={cn(th, "text-left")}>Thanh toán</th>
              <th className={cn(th, "text-left")}>T.gian</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => {
              const b = billByRoom.get(room.id);
              const t = tenantOf(room.id, b);
              const recorded = b?.reading_new != null;
              const vacant = !b || b.payment_status === "vacant";
              const name = b?.tenant_name ?? t?.name ?? null;
              const phone = b?.tenant_phone ?? t?.phone ?? "";
              return (
                <tr
                  key={room.id}
                  onClick={() => setOpenRoomId(room.id)}
                  className="cursor-pointer border-t border-border/50 hover:bg-primary/5"
                >
                  <td className={cn(cell, stickyCol, "z-10 font-extrabold text-primary")}>
                    {room.code}
                  </td>
                  <td className={cn(txt, "font-semibold", vacant && "text-muted")}>
                    {name ?? "(trống)"}
                  </td>
                  <td className={cn(txt, "text-muted")}>{phone}</td>
                  <td className={num}>{recorded ? formatNumber(b!.units) : "—"}</td>
                  <td className={num}>{recorded ? formatVND(b!.electricity_amount) : "—"}</td>
                  <td className={num}>{b ? formatVND(b.room_fee) : "—"}</td>
                  <td className={num}>{b ? formatVND(b.trash_fee) : "—"}</td>
                  <td className={cn(num, "font-bold")}>{b ? formatVND(b.total) : "—"}</td>
                  <td className={cell}>{b ? <StatusChip status={b.payment_status} /> : null}</td>
                  <td className={cn(txt, "text-muted")}>
                    {b?.paid_at ? formatDateTimeLong(b.paid_at) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-surface-2 font-bold">
              <td className={cn(cell, "sticky left-0 z-10 bg-surface-2")} colSpan={3}>
                Tổng cộng ({rooms.length})
              </td>
              <td className={num}>{formatNumber(totals.units)}</td>
              <td className={num}>{formatVND(totals.elec)}</td>
              <td className={num}>{formatVND(totals.room)}</td>
              <td className={num}>{formatVND(totals.trash)}</td>
              <td className={cn(num, "text-primary")}>{formatVND(totals.grand)}</td>
              <td className={cell} colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* tap a row → full editable tenant card */}
      <Dialog open={!!openRoomId} onOpenChange={(o) => !o && setOpenRoomId(null)}>
        <DialogContent className="max-w-2xl p-3 pt-12">
          <DialogTitle className="sr-only">Chi tiết phòng {openRoom?.code}</DialogTitle>
          {openRoom && selectedMonth && (
            <TenantRow
              room={openRoom}
              bill={openBill}
              tenant={openTenant}
              photoUrl={openTenant?.photo_url ?? null}
              month={selectedMonth}
              buildingName={settings?.building_name ?? "MH71"}
              open
              hideChevron
              onOpenChange={() => {
                /* dialog owns close (X / Esc / overlay) — don't collapse on click */
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
