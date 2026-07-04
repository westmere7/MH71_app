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
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Image as ImageIcon,
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
import { updateBillStatus, moveOutTenant, upsertTenant } from "@/lib/mutations";
import { uploadImage } from "@/lib/upload";
import { useMonthCtx } from "@/components/month-provider";
import { qk, usePaymentLogs, useAllBills } from "@/lib/queries";
import { PAYMENT_STATUS, isUnderpaid, paidAmountOf } from "@/lib/constants";
import type { StatusChoice } from "@/lib/constants";
import { formatVND, formatNumber, formatDateTime, monthLabel } from "@/lib/format";
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
  hideChevron,
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
  hideChevron?: boolean; // when shown standalone in a dialog
}) {
  const qc = useQueryClient();
  const { selectedLocked: locked, months } = useMonthCtx();

  const targetIndex = months.findIndex((m) => m.id === month.id);
  const prevMonth =
    targetIndex >= 0 && targetIndex < months.length - 1 ? months[targetIndex + 1] : null;

  const now = React.useMemo(() => new Date(), []);
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  const isPast = React.useCallback((m: MonthRow) => m.year < curY || (m.year === curY && m.month < curM), [curY, curM]);

  const allBillsQ = useAllBills();
  const allBills = allBillsQ.data ?? [];

  const prevBill = React.useMemo(() => {
    if (!prevMonth || !bill?.tenant_id) return null;
    return allBills.find((b) => b.month_id === prevMonth.id && b.tenant_id === bill.tenant_id) ?? null;
  }, [allBills, prevMonth, bill?.tenant_id]);

  const { hasUnpaidPrev, prevOwed } = React.useMemo(() => {
    if (!prevMonth || !isPast(prevMonth) || !prevBill) {
      return { hasUnpaidPrev: false, prevOwed: 0 };
    }
    const isPaid = prevBill.payment_status === "paid_cash" || prevBill.payment_status === "paid_transfer";
    const amountPaid = prevBill.amount_paid ?? prevBill.total;
    const isUnpaidOrUnderpaid =
      prevBill.payment_status === "unpaid" ||
      prevBill.payment_status === "partial" ||
      (isPaid && amountPaid < prevBill.total);
    const owed = prevBill.total - (isPaid ? amountPaid : 0);

    return {
      hasUnpaidPrev: isUnpaidOrUnderpaid && owed > 0,
      prevOwed: owed,
    };
  }, [prevMonth, prevBill, isPast]);

  const [cardOpen, setCardOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [logOpen, setLogOpen] = React.useState(false);
  const [payMethod, setPayMethod] = React.useState<"paid_cash" | "paid_transfer">("paid_transfer");
  const [docUploading, setDocUploading] = React.useState(false);
  const [viewDocIndex, setViewDocIndex] = React.useState<number | null>(null);

  async function handleAddDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ cho phép tải lên hình ảnh.");
      return;
    }
    if (!activeTenant) return;
    setDocUploading(true);
    try {
      const url = await uploadImage(
        "tenant-photos",
        file,
        `doc-tenant-${activeTenant.id}-`,
        true
      );
      const currentDocs = activeTenant.documents ?? [];
      const updatedDocs = [...currentDocs, url];
      await upsertTenant({
        id: activeTenant.id,
        room_id: activeTenant.room_id,
        name: activeTenant.name,
        phone: activeTenant.phone,
        move_in_date: activeTenant.move_in_date,
        photo_url: activeTenant.photo_url,
        notes: activeTenant.notes,
        same_household: activeTenant.same_household,
        camera_access: activeTenant.camera_access,
        documents: updatedDocs,
      });
      qc.invalidateQueries({ queryKey: qk.tenants });
      qc.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Đã tải tài liệu lên thành công.");
    } catch (err) {
      console.error(err);
      toast.error("Tải tài liệu lên thất bại.");
    } finally {
      setDocUploading(false);
    }
  }

  async function handleDeleteDoc(url: string) {
    if (!activeTenant) return;
    if (!window.confirm("Bạn có chắc chắn muốn xoá tài liệu này?")) return;
    try {
      const currentDocs = activeTenant.documents ?? [];
      const updatedDocs = currentDocs.filter((d) => d !== url);
      await upsertTenant({
        id: activeTenant.id,
        room_id: activeTenant.room_id,
        name: activeTenant.name,
        phone: activeTenant.phone,
        move_in_date: activeTenant.move_in_date,
        photo_url: activeTenant.photo_url,
        notes: activeTenant.notes,
        same_household: activeTenant.same_household,
        camera_access: activeTenant.camera_access,
        documents: updatedDocs,
      });
      qc.invalidateQueries({ queryKey: qk.tenants });
      qc.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Đã xoá tài liệu.");
      setViewDocIndex(null);
    } catch (err) {
      console.error(err);
      toast.error("Xoá tài liệu thất bại.");
    }
  }

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
      if (activeTenant) checkout(); // "Trống" while a tenant is in the room = trả phòng
      else statusMut.mutate({ status: "vacant" });
    } else {
      if (shownStatus !== "unpaid") {
        if (window.confirm("Bạn có chắc chắn muốn đổi trạng thái sang Chưa thanh toán không?")) {
          statusMut.mutate({ status: "unpaid" });
        }
      }
    }
  }

  const total = bill?.total ?? 0;
  const vacant = bill?.payment_status === "vacant";
  const activeTenant = vacant ? null : tenant;
  // the month's own record is authoritative; fall back to the live tenant only
  // for legacy bills that were imported without a name snapshot
  const name = vacant ? null : (bill?.tenant_name ?? tenant?.name ?? null);
  const phone = vacant ? null : (bill?.tenant_phone ?? tenant?.phone ?? null);
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
    // "trả thiếu" — paid amount on top, total below, so it fits the column
    <span className="flex flex-col items-end leading-tight">
      <span className="whitespace-nowrap text-base font-bold tabular-nums text-warning sm:text-xl">
        {formatNumber(paidAmountOf(bill))}
        <Dong />
      </span>
      <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-muted">
        / {formatNumber(total)}
        <Dong />
      </span>
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
  const isPaid = bill?.payment_status === "paid_cash" || bill?.payment_status === "paid_transfer";
  const canEditUnpaidInPast = locked && bill && !isPaid && bill.payment_status !== "vacant";
  const statusDisabled = locked
    ? !canEditUnpaidInPast
    : (vacant || statusMut.isPending || checkoutMut.isPending);

  const statusEl = bill ? (
    <div onClick={(e) => e.stopPropagation()}>
      <StatusMenu
        status={shownStatus}
        onChoose={onChoose}
        disabled={statusDisabled}
        allowPaidOnly={locked}
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
            <span className={cn("w-8 shrink-0 text-center text-base font-extrabold tracking-tight", hasUnpaidPrev ? "text-warning" : "text-primary")}>
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
                locked ? (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted text-sm font-bold">
                    -
                  </span>
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Plus className="h-5 w-5" />
                  </span>
                )
              ) : (
                <Avatar name={name} photoUrl={photoUrl} size={40} />
              )}
            </button>
            {/* name + phone (occupied) — or a single hint line when empty */}
            <div className="min-w-0 flex-1">
              {vacant ? (
                locked ? (
                  <div className="text-sm text-muted">-</div>
                ) : (
                  <div className="text-sm text-muted">
                    {'Phòng trống, nhấn "+" để thêm người thuê mới'}
                  </div>
                )
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("truncate font-semibold", hasUnpaidPrev && "text-warning")}>{displayName}</span>
                    {activeTenant?.camera_access && (
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
            {!hideChevron && (
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-muted transition-transform",
                  open && "rotate-180",
                )}
              />
            )}
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t border-border bg-surface-2/40 p-4">
            {!bill ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted">Tháng này chưa có hoá đơn cho phòng.</p>
                <Button size="sm" variant="outline" disabled={locked} onClick={() => setFormOpen(true)}>
                  {activeTenant ? "Sửa người thuê" : "Thêm người thuê"}
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
                {hasUnpaidPrev && prevMonth && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-surface/40 px-4 py-3 text-sm text-warning font-semibold">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-bold">Chưa thanh toán xong tháng trước</p>
                      <p className="mt-0.5 text-muted-foreground text-xs font-normal">
                        Khách thuê chưa thanh toán xong hoá đơn {monthLabel(prevMonth.year, prevMonth.month)}.
                        Còn nợ: <span className="font-bold text-warning">{formatVND(prevOwed)}</span>
                      </p>
                    </div>
                  </div>
                )}
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
                    {bill.payment_status === "paid_cash"
                      ? "Đã thanh toán (Tiền mặt)"
                      : bill.payment_status === "paid_transfer"
                      ? "Đã thanh toán (Chuyển khoản)"
                      : PAYMENT_STATUS[bill.payment_status].label}{" "}
                    • {formatDateTime(bill.paid_at)}
                  </p>
                )}

                {/* Documents section */}
                {activeTenant && (
                  <div className="mt-5 border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-foreground">Giấy tờ người thuê</span>
                      {docUploading && (
                        <span className="flex items-center gap-1.5 text-xs text-muted">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          Đang tải lên...
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2.5">
                      {(activeTenant.documents ?? []).map((docUrl, idx) => (
                        <div
                          key={docUrl}
                          className="group relative h-16 w-16 sm:h-20 sm:w-20 cursor-pointer overflow-hidden rounded-xl border border-border bg-surface bg-no-repeat bg-center bg-cover shadow-sm hover:border-primary transition-all"
                          onClick={() => setViewDocIndex(idx)}
                          style={{ backgroundImage: `url(${docUrl})` }}
                        >
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </div>
                      ))}
                      
                      {!locked && (
                        <label className="flex h-16 w-16 sm:h-20 sm:w-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-muted hover:bg-surface hover:text-primary hover:border-primary transition-all">
                          <Plus className="h-5 w-5" />
                          <span className="text-[10px] font-bold mt-1">Thêm ảnh</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAddDoc}
                            disabled={docUploading}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setCardOpen(true)}>
                    <ReceiptText className="h-4 w-4" />
                    Thẻ thanh toán
                  </Button>
                  {activeTenant ? (
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
        tenant={activeTenant}
        defaultRent={room.default_rent}
        billId={bill?.id}
        billVacant={vacant}
        billName={bill?.tenant_name ?? null}
        billPhone={bill?.tenant_phone ?? null}
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

      {/* Document view & cycle dialog */}
      {activeTenant && viewDocIndex !== null && (
        <Dialog open={true} onOpenChange={() => setViewDocIndex(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between pr-6">
                <span>Tài liệu {viewDocIndex + 1} của {activeTenant.name}</span>
                {!locked && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-danger hover:bg-danger/10 hover:text-danger"
                    onClick={() => {
                      const docs = activeTenant.documents ?? [];
                      if (viewDocIndex < docs.length) {
                        handleDeleteDoc(docs[viewDocIndex]);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Xoá
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="relative mt-2 flex items-center justify-center bg-black/5 dark:bg-black/25 rounded-2xl p-4 min-h-[300px]">
              {/* Image display */}
              {(() => {
                const docs = activeTenant.documents ?? [];
                const currentUrl = docs[viewDocIndex];
                if (!currentUrl) return null;
                return (
                  <img
                    src={currentUrl}
                    alt={`Tài liệu ${viewDocIndex + 1}`}
                    className="max-h-[60vh] w-full rounded-lg object-contain"
                  />
                );
              })()}

              {/* Cycling controls */}
              {(() => {
                const docs = activeTenant.documents ?? [];
                if (docs.length <= 1) return null;
                return (
                  <>
                    <button
                      type="button"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/85 p-2 shadow-md hover:bg-surface text-foreground transition-colors"
                      onClick={() => setViewDocIndex((viewDocIndex - 1 + docs.length) % docs.length)}
                      aria-label="Tài liệu trước"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/85 p-2 shadow-md hover:bg-surface text-foreground transition-colors"
                      onClick={() => setViewDocIndex((viewDocIndex + 1) % docs.length)}
                      aria-label="Tài liệu sau"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                );
              })()}
            </div>
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
