import * as React from "react";
import { formatVND, formatNumber, monthLabel, periodLabel } from "@/lib/format";
import type { Bill, MonthRow, Room } from "@/lib/supabase/types";

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-[#dfe3ee] py-2 last:border-0">
      <span className="text-[15px]" style={{ color: "#5a647e" }}>
        {label}
        {hint && <span className="ml-1 text-[13px] text-[#9aa3b8]">({hint})</span>}
      </span>
      <span className="text-[15px] font-semibold text-[#16203c]">{value}</span>
    </div>
  );
}

/** The printable/exportable payment card. Shared by the dialog and the bulk ZIP
 *  export so both render identically. The ref targets the card root for toPng. */
export const PaymentCardView = React.forwardRef<
  HTMLDivElement,
  {
    bill: Bill;
    room: Room;
    month: MonthRow;
    tenantName: string | null;
    buildingName: string;
    qrUrl?: string | null;
  }
>(function PaymentCardView({ bill, room, month, tenantName, buildingName, qrUrl }, ref) {
  return (
    <div
      ref={ref}
      style={{ fontFamily: "var(--font-be-vietnam), sans-serif" }}
      className="overflow-hidden rounded-2xl border border-[#e3e7f1] bg-white text-[#16203c]"
    >
      <div className="bg-[#1b2a4a] px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <span className="text-lg font-extrabold">{buildingName}</span>
          <span className="rounded-lg bg-[#14b6d6] px-2.5 py-1 text-sm font-bold">{room.code}</span>
        </div>
        <div className="mt-1 text-sm text-[#b9c4dd]">
          Phiếu báo tiền {monthLabel(month.year, month.month)}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[14px] font-medium text-[#5a647e]">
            Khách thuê: {tenantName ?? "—"}
          </span>
          <span className="text-[13px] text-[#9aa3b8]">
            {periodLabel(month.period_start, month.period_end)}
          </span>
        </div>

        <Row
          label="Tiền điện"
          value={formatVND(bill.electricity_amount)}
          hint={`${formatNumber(bill.units)} số × ${formatNumber(bill.electricity_rate)}`}
        />
        <Row label="Tiền phòng" value={formatVND(bill.room_fee)} />
        <Row label="Tiền rác" value={formatVND(bill.trash_fee)} />

        <div className="mt-3 flex items-center justify-between rounded-xl bg-[#eef7fb] px-4 py-3">
          <span className="text-[15px] font-bold text-[#16203c]">TỔNG CỘNG</span>
          <span className="text-xl font-extrabold text-[#0e8aa3]">{formatVND(bill.total)}</span>
        </div>

        <p className="mt-3 text-center text-[12px] text-[#9aa3b8]">
          Vui lòng thanh toán đúng hạn. Cảm ơn quý khách!
        </p>

        {qrUrl && (
          <div className="mt-4 flex flex-col items-center border-t border-dashed border-[#dfe3ee] pt-3">
            <span className="mb-2 text-[13px] font-semibold text-[#5a647e]">
              MÃ QR QUÉT THANH TOÁN
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              crossOrigin="anonymous"
              alt="QR Code thanh toán"
              className="h-[280px] w-[280px] rounded-lg border border-[#e3e7f1] bg-white object-contain shadow-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
});
