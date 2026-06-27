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
  Plus,
  History,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusMenu } from "./status-menu";
import { PaymentCardDialog } from "./payment-card";
import { PaymentDialog } from "./payment-dialog";
import { TenantFormDialog } from "./tenant-form-dialog";
import { updateBillStatus, moveOutTenant } from "@/lib/mutations";
import { useMonthCtx } from "@/components/month-provider";
import { qk, usePaymentLogs } from "@/lib/queries";
import { PAYMENT_STATUS, isUnderpaid, paidAmountOf } from "@/lib/constants";
import type { StatusChoice } from "@/lib/constants";
import { formatVND, formatNumber, formatDateTime } from "@/lib/format";
import type { Bill, MonthRow, PaymentStatus, Room, Tenant } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function TenantRow({
  room,
  bill,
  tenant,
  photoUrl,
  month,
  buildingName,
  open,
  onOpenChange,
  dimmed,
}: {
  room: Room;
  bill: Bill | null;
  tenant: Tenant | null;
  photoUrl: string | null; // photo of the bill's tenant (tied to the person)
  month: MonthRow;
  buildingName: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dimmed?: boolean;
}) {
  const qc = useQueryClient();
  const { selectedLocked: locked } = useMonthCtx();
  const [cardOpen, setCardOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [logOpen, setLogOpen] = React.useState(false);
  const [payMethod, setPayMethod] = React.useState<"paid_cash" | "paid_transfer">("paid_transfer");

  const logsQ = usePaymentLogs(logOpen && bill ? bill.id : null);

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
        `Xác nhận phòng ${room.code} đã TRẢ PHÒNG?\n\nThông tin người thuê hiện tại sẽ được gỡ và phòng chuyển sang "Trống".`,
      )
    )
      checkoutMut.mutate();
  }

  function onChoose(c: StatusChoice) {
    if (c === "paid") {
      // open the payment dialog to pick method + (optionally) a "trả thiếu" amount
      setPayMethod(bill?.payment_status === "paid_cash" ? "paid_cash" : "paid_transfer");
      setPayOpen(true);
    } else if (c === "vacant") {
      if (tenant) checkout(); // "Trống" while a tenant is in the room = trả phòng
      else statusMut.mutate({ status: "vacant" });
    } else {
      if (shownStatus !== "unpaid") statusMut.mutate({ status: "unpaid" });
    }
  }

  const total = bill?.total ?? 0;
  const vacant = bill?.payment_status === "vacant";
  // the month's own record is authoritative; fall back to the live tenant only
  // for legacy bills that were imported without a name snapshot
  const name = bill?.tenant_name ?? tenant?.name ?? null;
  const phone = bill?.tenant_phone ?? tenant?.phone ?? null;
  const displayName = !vacant && name ? name : "(Phòng trống)";

  function toggle() {
    onOpenChange(!open);
  }

  // total + status are shown inline on desktop and on a second row on mobile.
  // when underpaid ("trả thiếu") show "đã thu / tổng", e.g. 1.500.000/2.000.000 đ
  const underpaid = bill ? isUnderpaid(bill) : false;
  const totalEl = !bill ? (
    <span className="whitespace-nowrap text-base font-bold tabular-nums sm:text-xl">—</span>
  ) : underpaid ? (
    <span className="whitespace-nowrap text-base font-bold tabular-nums sm:text-xl">
      <span className="text-warning">{formatNumber(paidAmountOf(bill))}</span>
      <span className="text-muted">/{formatNumber(total)}</span>
      <Dong />
    </span>
  ) : (
    <span className="whitespace-nowrap text-base font-bold tabular-nums sm:text-xl">
      {formatNumber(total)}
      <Dong />
    </span>
  );
  // legacy "partial" (Còn nợ) bills are shown as "Chưa thanh toán" now
  const shownStatus: PaymentStatus =
    bill?.payment_status === "partial" ? "unpaid" : (bill?.payment_status ?? "unpaid");
  // a vacant room's status can't be changed until a tenant is added ("Thêm khách")
  const statusEl = bill ? (
    <div onClick={(e) => e.stopPropagation()}>
      <StatusMenu
        status={shownStatus}
        onChoose={onChoose}
        disabled={locked || vacant || statusMut.isPending || checkoutMut.isPending}
      />
    </div>
  ) : (
    <span className="text-sm text-muted">Chưa có hoá đơn</span>
  );

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200",
        open && "ring-2 ring-primary/40",
        dimmed && "scale-[0.99] opacity-40",
      )}
    >
      <Collapsible open={open} onOpenChange={onOpenChange}>
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
            <span className="w-8 shrink-0 text-center text-base font-extrabold tracking-tight text-primary">
              {room.code}
            </span>
            {/* avatar — tapping opens "Sửa thông tin" (add when empty);
                the rest of the card still expands/collapses */}
            <button
              type="button"
              aria-label="Sửa thông tin"
              disabled={locked}
              onClick={(e) => {
                e.stopPropagation();
                if (!locked) setFormOpen(true);
              }}
              className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {vacant ? (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Plus className="h-5 w-5" />
                </span>
              ) : (
                <Avatar name={name} photoUrl={photoUrl} size={40} />
              )}
            </button>
            {/* name + phone (occupied) — or a single hint line when empty */}
            <div className="min-w-0 flex-1">
              {vacant ? (
                <div className="text-sm text-muted">
                  {'Phòng trống, nhấn "+" để thêm người thuê mới'}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold">{displayName}</span>
                    {tenant?.camera_access && (
                      <Video className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-sm text-muted">
                    {phone ? (
                      <a
                        href={`tel:${phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline"
                      >
                        {phone}
                      </a>
                    ) : (
                      "Chưa có SĐT"
                    )}
                  </div>
                </>
              )}
            </div>
            {/* mobile: amount stacked over status. desktop: fixed-width columns so
                different status widths can't shift the fee, divider centered between */}
            <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-0">
              <div className="sm:w-36 sm:text-right">{totalEl}</div>
              <div className="hidden sm:mx-3 sm:block sm:h-6 sm:w-px sm:bg-border/60" />
              <div className="flex justify-end sm:w-32 sm:justify-start">{statusEl}</div>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted transition-transform",
                open && "rotate-180",
              )}
            />
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t border-border bg-surface-2/40 p-4">
            {!bill ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted">Tháng này chưa có hoá đơn cho phòng.</p>
                <Button size="sm" variant="outline" disabled={locked} onClick={() => setFormOpen(true)}>
                  {tenant ? "Sửa người thuê" : "Thêm người thuê"}
                </Button>
              </div>
            ) : vacant ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <BreakdownRow
                    label="Tiền điện"
                    hint={
                      bill.reading_new == null
                        ? "Chưa ghi số điện"
                        : `${formatNumber(bill.units)} số × ${formatNumber(bill.electricity_rate)}đ`
                    }
                    hintTone={bill.reading_new == null ? "warning" : "muted"}
                    value={bill.reading_new == null ? "—" : formatVND(bill.electricity_amount)}
                  />
                  <div className="mt-1 flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
                    <span className="font-bold">Tổng cộng</span>
                    <span className="text-lg font-extrabold text-primary">
                      {formatVND(bill.total)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted">
                  Phòng đang trống — thêm người thuê để thu tiền phòng &amp; rác.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={locked} onClick={() => setFormOpen(true)}>
                    <UserPlus className="h-4 w-4" />
                    Thêm người thuê
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setLogOpen(true)}>
                    <History className="h-4 w-4" />
                    Lịch sử
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <BreakdownRow
                    label="Tiền điện"
                    hint={
                      bill.reading_new == null
                        ? "Chưa ghi số điện"
                        : `${formatNumber(bill.units)} số × ${formatNumber(bill.electricity_rate)}đ`
                    }
                    hintTone={bill.reading_new == null ? "warning" : "muted"}
                    value={bill.reading_new == null ? "—" : formatVND(bill.electricity_amount)}
                  />
                  <BreakdownRow label="Tiền phòng" value={formatVND(bill.room_fee)} />
                  <BreakdownRow label="Tiền rác" value={formatVND(bill.trash_fee)} />
                  <div className="mt-1 flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
                    <span className="font-bold">Tổng cộng</span>
                    <span className="text-lg font-extrabold text-primary">
                      {formatVND(bill.total)}
                    </span>
                  </div>
                  {underpaid && (
                    <div className="flex items-center justify-between px-3 text-sm">
                      <span className="text-muted">Đã thu</span>
                      <span className="font-semibold">
                        {formatVND(paidAmountOf(bill))}{" "}
                        <span className="text-warning">
                          • còn nợ {formatVND(total - paidAmountOf(bill))}
                        </span>
                      </span>
                    </div>
                  )}
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
                      <Button size="sm" variant="outline" disabled={locked} onClick={() => setFormOpen(true)}>
                        <UserPen className="h-4 w-4" />
                        Sửa thông tin
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={checkout}
                        disabled={checkoutMut.isPending || locked}
                        className="text-danger"
                      >
                        <LogOut className="h-4 w-4" />
                        Trả phòng
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" disabled={locked} onClick={() => setFormOpen(true)}>
                      <UserPlus className="h-4 w-4" />
                      Thêm người thuê
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setLogOpen(true)}>
                    <History className="h-4 w-4" />
                    Lịch sử
                  </Button>
                </div>
              </>
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
        billVacant={vacant}
      />
      {bill && (
        <PaymentDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          roomCode={room.code}
          tenantName={name}
          total={bill.total}
          defaultMethod={payMethod}
          onConfirm={(method, amountPaid) => {
            statusMut.mutate({ status: method, amountPaid });
            setPayOpen(false);
          }}
        />
      )}
      {bill && (
        <Dialog open={logOpen} onOpenChange={setLogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Lịch sử thanh toán — {room.code}</DialogTitle>
            </DialogHeader>
            {logsQ.isLoading ? (
              <p className="text-sm text-muted">Đang tải…</p>
            ) : logsQ.data && logsQ.data.length > 0 ? (
              <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                {logsQ.data.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 text-sm last:border-0"
                  >
                    <span>
                      {log.old_status ? `${PAYMENT_STATUS[log.old_status].short} → ` : ""}
                      <span className="font-semibold">{PAYMENT_STATUS[log.new_status].short}</span>
                    </span>
                    <span className="text-muted">{formatDateTime(log.changed_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Chưa có thay đổi nào được ghi nhận.</p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

/** Small, muted "₫" currency mark shown after an amount. */
function Dong() {
  return <span className="ml-0.5 align-baseline text-[0.7em] font-semibold text-muted">₫</span>;
}

function BreakdownRow({
  label,
  value,
  hint,
  hintTone,
}: {
  label: string;
  value: string;
  hint?: string;
  hintTone?: "muted" | "warning";
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted">
        {label}
        {hint && (
          <span
            className={cn(
              "ml-1.5 text-sm",
              hintTone === "warning" ? "font-semibold text-warning" : "text-muted/70",
            )}
          >
            {hintTone === "warning" ? hint : `(${hint})`}
          </span>
        )}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
