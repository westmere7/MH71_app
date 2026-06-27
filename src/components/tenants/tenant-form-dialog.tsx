"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, LogOut } from "lucide-react";
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
import { upsertTenant, moveOutTenant, updateRoomRent, type TenantInput } from "@/lib/mutations";
import { uploadImage } from "@/lib/upload";
import { qk } from "@/lib/queries";
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
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roomId: string;
  roomCode: string;
  tenant: Tenant | null;
  defaultRent: number;
  billId?: string;
}) {
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [moveIn, setMoveIn] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [cameraAccess, setCameraAccess] = React.useState(false);
  const [basePrice, setBasePrice] = React.useState(defaultRent);
  const [uploading, setUploading] = React.useState(false);

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
      await upsertTenant(input);
      // base price is the same field as in "Thiết lập giá" (rooms.default_rent);
      // also sync the current bill so the visible total updates.
      if (basePrice !== defaultRent) await updateRoomRent(roomId, basePrice, billId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tenants });
      qc.invalidateQueries({ queryKey: qk.rooms });
      qc.invalidateQueries({ queryKey: ["bills"] });
      toast.success(tenant ? "Đã cập nhật khách thuê" : "Đã thêm khách thuê");
      onOpenChange(false);
    },
    onError: () => toast.error("Lưu không thành công."),
  });

  const moveOut = useMutation({
    mutationFn: async () => {
      if (!tenant) return;
      const today = new Date().toISOString().slice(0, 10);
      return moveOutTenant(tenant.id, today);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tenants });
      toast.success("Đã ghi nhận khách trả phòng");
      onOpenChange(false);
    },
    onError: () => toast.error("Không thực hiện được."),
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
            {tenant ? "Sửa thông tin khách" : "Thêm khách thuê"} — {roomCode}
          </DialogTitle>
          <DialogDescription>
            Để trống ảnh sẽ hiển thị chữ viết tắt tên khách.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* photo */}
          <div className="flex items-center gap-4">
            <Avatar name={name} photoUrl={photoUrl} size={64} />
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
            <Label htmlFor="t-name">Tên khách *</Label>
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
            {tenant && (
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm("Ghi nhận khách này đã trả phòng?")) moveOut.mutate();
                }}
                disabled={moveOut.isPending}
                className="text-danger"
              >
                <LogOut className="h-5 w-5" />
                Khách trả phòng
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
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
