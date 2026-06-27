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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { StatusMenu } from "./status-menu";
import { PaymentCardDialog } from "./payment-card";
import { TenantFormDialog } from "./tenant-form-dialog";
import { updateBillStatus } from "@/lib/mutations";
import { qk, usePaymentLogs } from "@/lib/queries";
import { PAYMENT_STATUS } from "@/lib/constants";
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

  const logsQ = usePaymentLogs(open && bill ? bill.id : null);

  const statusMut = useMutation({
    mutationFn: (s: PaymentStatus) => updateBillStatus(bill!.id, s),
    onMutate: async (s) => {
      const key = qk.bills(month.id);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Bill[]>(key);
      qc.setQueryData<Bill[]>(key, (old) =>
        (old ?? []).map((b) => (b.id === bill!.id ? { ...b, payment_status: s } : b)),
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

  const total = bill?.total ?? 0;
  const name = tenant?.name ?? bill?.tenant_name ?? null;
  const duration = tenancyDuration(tenant?.move_in_date);

  function toggle() {
    setOpen((o) => !o);
  }

  // total + status are shown inline on desktop and on a second row on mobile
  const totalEl = (
    <span className="text-base font-bold tabular-nums">{bill ? formatVND(total) : "—"}</span>
  );
  const statusEl = bill ? (
    <div onClick={(e) => e.stopPropagation()}>
      <StatusMenu
        status={bill.payment_status}
        onSelect={(s) => statusMut.mutate(s)}
        disabled={statusMut.isPending}
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
            {/* room number */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
              <span className="text-base font-extrabold">{room.code}</span>
            </div>
            {/* avatar */}
            <Avatar name={name} photoUrl={tenant?.photo_url} size={40} />
            {/* name + phone + duration */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{name ?? "Phòng trống"}</span>
                {tenant?.camera_access && <Video className="h-4 w-4 shrink-0 text-primary" />}
              </div>
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

          {/* mobile: total + status on a second row */}
          <div className="mt-2.5 flex items-center justify-between gap-2 sm:hidden">
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
                  <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                    {tenant ? <UserPen className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    {tenant ? "Sửa khách" : "Thêm khách"}
                  </Button>
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
