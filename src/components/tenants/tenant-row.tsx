"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ReceiptText,
  UserPen,
  UserPlus,
  Video,
  Clock,
  LogOut,
  DoorClosed,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { StatusMenu } from "./status-menu";
import { PaymentCardDialog } from "./payment-card";
import { PaymentDialog } from "./payment-dialog";
import { TenantFormDialog } from "./tenant-form-dialog";
import { updateBillStatus, moveOutTenant } from "@/lib/mutations";
import { qk, usePaymentLogs } from "@/lib/queries";
import { PAYMENT_STATUS, isUnderpaid, paidAmountOf } from "@/lib/constants";
import { formatVND, formatNumber, formatDateTime, tenancyDuration } from "@/lib/format";
import type { Bill, MonthRow, PaymentStatus, Room, Tenant } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function TenantRow({
  room,
  bill,
  tenant,
  month,
  buildingName,
}: {
  room: Room;
  bill: Bill | null;
  tenant: Tenant | null;
  month: MonthRow;
  buildingName: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [cardOpen, setCardOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [payMethod, setPayMethod] = React.useState<"paid_cash" | "paid_transfer">("paid_transfer");

  const logsQ = usePaymentLogs(open && bill ? bill.id : null);

  const statusMut = useMutation({
    mutationFn: (v: { status: PaymentStatus; amountPaid?: number | null }) =>
      updateBillStatus(bill!.id, v.status, v.amountPaid ?? null),
    onMutate: async ({ status, amountPaid }) => {
      const key = qk.bills(month.id);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Bill[]>(key);
      qc.setQueryData<Bill[]>(key, (old) =>
        (old ?? []).map((b) =>
          b.id === bill!.id
            ? {
                ...b,
                payment_status: status,
                amount_paid: amountPaid ?? null,
                ...(status === "vacant" ? { tenant_name: null, tenant_id: null } : {}),
              }
            : b,
        ),
      );
      return { prev, key };
    },
    onError: (_e, _s, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
      toast.error("Cập nhật trạng thái thất bại.");
    },
    onSuccess: () => toast.success("Đã cập nhật trạng thái"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      if (bill) qc.invalidateQueries({ queryKey: qk.logs(bill.id) });
    },
  });

  // "Trả phòng": move the tenant out + set the room to Trống (vacant). Setting the
  // status to "Trống" manually does the same thing.
  const checkoutMut = useMutation({
    mutationFn: async () => {
      if (tenant) await moveOutTenant(tenant.id, new Date().toISOString().slice(0, 10));
      if (bill) await updateBillStatus(bill.id, "vacant");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: qk.tenants });
      toast.success("Đã trả phòng — phòng chuyển sang Trống");
    },
    onError: () => toast.error("Không thực hiện được."),
  });

  function checkout() {
    if (
      confirm(
        `Xác nhận phòng ${room.code} đã TRẢ PHÒNG?\n\nThông tin khách hiện tại sẽ được gỡ và phòng chuyển sang "Trống".`,
      )
    )
      checkoutMut.mutate();
  }

  function onStatusSelect(s: PaymentStatus) {
    if (s === "paid_cash" || s === "paid_transfer") {
      // open the payment dialog to (optionally) record a "trả thiếu" amount
      setPayMethod(s);
      setPayOpen(true);
    } else if (s === "vacant" && tenant) {
      checkout(); // choosing "Trống" while a tenant is in the room = trả phòng
    } else {
      statusMut.mutate({ status: s });
    }
  }

  const total = bill?.total ?? 0;
  const vacant = bill?.payment_status === "vacant";
  const name = tenant?.name ?? bill?.tenant_name ?? null;
  const displayName = !vacant && name ? name : "(Phòng trống)";
  const duration = vacant ? null : tenancyDuration(tenant?.move_in_date);

  function toggle() {
    setOpen((o) => !o);
  }

  // total + status are shown inline on desktop and on a second row on mobile.
  // when underpaid ("trả thiếu") show "đã thu / tổng", e.g. 1.500.000/2.000.000 đ
  const underpaid = bill ? isUnderpaid(bill) : false;
  const totalEl = !bill ? (
    <span className="text-base font-bold tabular-nums">—</span>
  ) : underpaid ? (
    <span className="text-base font-bold tabular-nums">
      <span className="text-warning">{formatNumber(paidAmountOf(bill))}</span>
      <span className="text-muted">/{formatVND(total)}</span>
    </span>
  ) : (
    <span className="text-base font-bold tabular-nums">{formatVND(total)}</span>
  );
  // legacy "partial" (Còn nợ) bills are shown as "Chưa thanh toán" now
  const shownStatus: PaymentStatus =
    bill?.payment_status === "partial" ? "unpaid" : (bill?.payment_status ?? "unpaid");
  const statusEl = bill ? (
    <div onClick={(e) => e.stopPropagation()}>
      <StatusMenu
        status={shownStatus}
        onSelect={onStatusSelect}
        disabled={statusMut.isPending || checkoutMut.isPending}
      />
    </div>
  ) : (
    <span className="text-sm text-muted">Chưa có hoá đơn</span>
  );

  return (
    <Card className="overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div
          role="button"
          tabIndex={0}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          }}
          className="cursor-pointer p-3 sm:p-4"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            {/* room number — bold text (no box) so it reads as a label, not an avatar */}
            <span className="w-9 shrink-0 text-center text-lg font-extrabold tracking-tight text-primary">
              {room.code}
            </span>
            {/* avatar (muted door icon when the room is empty) */}
            {vacant ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
                <DoorClosed className="h-5 w-5" />
              </span>
            ) : (
              <Avatar name={name} photoUrl={tenant?.photo_url} size={40} />
            )}
            {/* name + phone + duration */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn("truncate font-semibold", vacant && "text-muted")}>
                  {displayName}
                </span>
                {!vacant && tenant?.camera_access && (
                  <Video className="h-4 w-4 shrink-0 text-primary" />
                )}
              </div>
              {!vacant && (
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                  {tenant?.phone ? (
                    <a
                      href={`tel:${tenant.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-primary hover:underline"
                    >
                      {tenant.phone}
                    </a>
                  ) : (
                    <span>Chưa có SĐT</span>
                  )}
                  {duration && <span>• {duration}</span>}
                </div>
              )}
            </div>
            {/* desktop: total + status inline */}
            <div className="hidden items-center gap-5 sm:flex">
              {totalEl}
              {statusEl}
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted transition-transform",
                open && "rotate-180",
              )}
            />
          </div>

          {/* mobile: total + status on a second row, both right-aligned */}
          <div className="mt-2.5 flex items-center justify-end gap-3 sm:hidden">
            {totalEl}
            {statusEl}
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t border-border bg-surface-2/40 p-4">
            {bill ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <BreakdownRow
                    label="Tiền điện"
                    hint={`${formatNumber(bill.units)} số × ${formatNumber(bill.electricity_rate)}đ`}
                    value={formatVND(bill.electricity_amount)}
                  />
                  <BreakdownRow label="Tiền phòng" value={formatVND(bill.room_fee)} />
                  <BreakdownRow label="Tiền rác" value={formatVND(bill.trash_fee)} />
                  <div className="mt-1 flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
                    <span className="font-bold">Tổng cộng</span>
                    <span className="text-lg font-extrabold text-primary">
                      {formatVND(bill.total)}
                    </span>
                  </div>
                </div>

                {bill.paid_at && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                    <Clock className="h-4 w-4" />
                    {PAYMENT_STATUS[bill.payment_status].label} • {formatDateTime(bill.paid_at)}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setCardOpen(true)}>
                    <ReceiptText className="h-4 w-4" />
                    Thẻ thanh toán
                  </Button>
                  {tenant ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                        <UserPen className="h-4 w-4" />
                        Sửa khách
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={checkout}
                        disabled={checkoutMut.isPending}
                        className="text-danger"
                      >
                        <LogOut className="h-4 w-4" />
                        Trả phòng
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                      <UserPlus className="h-4 w-4" />
                      Thêm khách
                    </Button>
                  )}
                </div>

                {logsQ.data && logsQ.data.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                      Lịch sử trạng thái
                    </div>
                    <ul className="flex flex-col gap-1">
                      {logsQ.data.slice(0, 5).map((log) => (
                        <li key={log.id} className="flex items-center justify-between text-sm">
                          <span>
                            {log.old_status
                              ? `${PAYMENT_STATUS[log.old_status].short} → `
                              : ""}
                            <span className="font-semibold">
                              {PAYMENT_STATUS[log.new_status].short}
                            </span>
                          </span>
                          <span className="text-muted">{formatDateTime(log.changed_at)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">Tháng này chưa có hoá đơn cho phòng.</p>
                <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                  {tenant ? "Sửa khách" : "Thêm khách"}
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {bill && (
        <PaymentCardDialog
          open={cardOpen}
          onOpenChange={setCardOpen}
          bill={bill}
          room={room}
          month={month}
          tenantName={name}
          buildingName={buildingName}
        />
      )}
      <TenantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        roomId={room.id}
        roomCode={room.code}
        tenant={tenant}
        defaultRent={room.default_rent}
        billId={bill?.id}
      />
      {bill && (
        <PaymentDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          roomCode={room.code}
          total={bill.total}
          defaultMethod={payMethod}
          onConfirm={(method, amountPaid) => {
            statusMut.mutate({ status: method, amountPaid });
            setPayOpen(false);
          }}
        />
      )}
    </Card>
  );
}

function BreakdownRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted">
        {label}
        {hint && <span className="ml-1.5 text-sm text-muted/70">({hint})</span>}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
