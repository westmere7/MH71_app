"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import {
  upsertTenant,
  updateRoomRent,
  reactivateBill,
  updateBillTenant,
  type TenantInput,
} from "@/lib/mutations";
import { uploadImage } from "@/lib/upload";
import { qk, useSettings } from "@/lib/queries";
import { formatVND } from "@/lib/format";
import type { Tenant } from "@/lib/supabase/types";
import { toast } from "sonner";

export function TenantFormDialog({
  open,
  onOpenChange,
  roomId,
  roomCode,
  tenant,
  defaultRent,
  billId,
  billVacant,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roomId: string;
  roomCode: string;
  tenant: Tenant | null;
  defaultRent: number;
  billId?: string;
  billVacant?: boolean;
}) {
  const qc = useQueryClient();
  const trashFee = useSettings().data?.trash_fee ?? 50000;
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [moveIn, setMoveIn] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [cameraAccess, setCameraAccess] = React.useState(false);
  const [basePrice, setBasePrice] = React.useState(defaultRent);
  const [uploading, setUploading] = React.useState(false);
  const [viewOpen, setViewOpen] = React.useState(false);

  // reset form whenever the dialog opens for a (different) tenant
  React.useEffect(() => {
    if (!open) return;
    setName(tenant?.name ?? "");
    setPhone(tenant?.phone ?? "");
    setMoveIn(tenant?.move_in_date ?? "");
    setNotes(tenant?.notes ?? "");
    setPhotoUrl(tenant?.photo_url ?? null);
    setCameraAccess(tenant?.camera_access ?? false);
    setBasePrice(defaultRent);
  }, [open, tenant, defaultRent]);

  const save = useMutation({
    mutationFn: async () => {
      const input: TenantInput = {
        id: tenant?.id,
        room_id: roomId,
        name: name.trim(),
        phone: phone.trim() || null,
        move_in_date: moveIn || null,
        photo_url: photoUrl,
        notes: notes.trim() || null,
        same_household: tenant?.same_household ?? false,
        camera_access: cameraAccess,
      };
      const saved = await upsertTenant(input);
      // base price is the same field as in "Thiết lập giá" (rooms.default_rent).
      const reactivating = !tenant && !!billVacant && !!billId;
      if (basePrice !== defaultRent) {
        // sync the bill's room_fee too, unless we're about to reactivate it below
        await updateRoomRent(roomId, basePrice, reactivating ? undefined : billId);
      }
      // adding a tenant to an empty room turns the bill back on (unpaid + fees)
      if (reactivating && saved) {
        await reactivateBill(billId!, basePrice, trashFee, saved.id, input.name, input.phone);
      } else if (billId && saved) {
        // editing an existing tenant: snapshot the name + phone onto THIS month's
        // bill only — past/future months keep their own record
        await updateBillTenant(billId, saved.id, input.name, input.phone);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tenants });
      qc.invalidateQueries({ queryKey: qk.rooms });
      qc.invalidateQueries({ queryKey: ["bills"] });
      toast.success(tenant ? "Đã cập nhật người thuê" : "Đã thêm người thuê");
      onOpenChange(false);
    },
    onError: () => toast.error("Lưu không thành công."),
  });

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage("tenant-photos", file, `room-${roomCode}-`);
      setPhotoUrl(url);
    } catch {
      toast.error("Tải ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {tenant ? "Sửa thông tin người thuê" : "Thêm người thuê"} — {roomCode}
          </DialogTitle>
          <DialogDescription>
            Để trống ảnh sẽ hiển thị chữ viết tắt tên người thuê.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* photo */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => photoUrl && setViewOpen(true)}
              className={photoUrl ? "cursor-zoom-in" : "cursor-default"}
              aria-label={photoUrl ? "Xem ảnh" : undefined}
            >
              <Avatar name={name} photoUrl={photoUrl} size={64} />
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-border px-4 py-2.5 text-base font-semibold hover:bg-surface-2">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              Tải ảnh
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
            {photoUrl && (
              <button
                type="button"
                onClick={() => setPhotoUrl(null)}
                className="text-sm font-medium text-danger"
              >
                Xoá ảnh
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="t-name">Tên người thuê *</Label>
            <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-phone">SĐT / Zalo</Label>
              <Input
                id="t-phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-movein">Ngày vào ở</Label>
              <Input
                id="t-movein"
                type="date"
                value={moveIn}
                onChange={(e) => setMoveIn(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="t-base">Tiền phòng / tháng (giá cơ bản)</Label>
            <Input
              id="t-base"
              type="number"
              inputMode="numeric"
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
            />
            <p className="text-xs text-muted">
              Hiện tại: {formatVND(defaultRent)}. Sửa ở đây hoặc trong “Thiết lập giá” đều như nhau.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="t-notes">Ghi chú</Label>
            <Textarea id="t-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2.5">
            <CheckRow
              checked={cameraAccess}
              onChange={setCameraAccess}
              label="Được truy cập camera"
            />
          </div>

          <div className="mt-1 flex flex-col gap-2">
            <Button
              onClick={() => save.mutate()}
              disabled={!name.trim() || save.isPending}
              size="lg"
            >
              {save.isPending && <Loader2 className="h-5 w-5 animate-spin" />}
              Lưu
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* tap the avatar to view the photo larger */}
      {photoUrl && (
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{name || "Ảnh người thuê"}</DialogTitle>
            </DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={name || "Ảnh người thuê"}
              className="max-h-[70vh] w-full rounded-xl object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 rounded-md accent-[var(--color-primary)]"
      />
      <span className="text-base">{label}</span>
    </label>
  );
}
