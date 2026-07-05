"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, Plus, Trash2, ChevronLeft, ChevronRight, Download, X } from "lucide-react";
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
import { uploadImage, deleteImage } from "@/lib/upload";
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
  billName,
  billPhone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roomId: string;
  roomCode: string;
  tenant: Tenant | null;
  defaultRent: number;
  billId?: string;
  billVacant?: boolean;
  billName?: string | null; // this month's recorded name (preferred for prefill)
  billPhone?: string | null; // this month's recorded phone (preferred for prefill)
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

  const [documents, setDocuments] = React.useState<string[]>([]);
  const [docUploading, setDocUploading] = React.useState(false);
  const [viewDocIndex, setViewDocIndex] = React.useState<number | null>(null);

  const touchStartX = React.useRef<number | null>(null);
  const touchEndX = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diffX = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (documents.length <= 1) return;

    if (diffX > threshold) {
      setViewDocIndex((prev) => (prev !== null ? (prev + 1) % documents.length : null));
    } else if (diffX < -threshold) {
      setViewDocIndex((prev) =>
        prev !== null ? (prev - 1 + documents.length) % documents.length : null
      );
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  async function handleAddDocs(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const allImages = files.every((file) => file.type.startsWith("image/"));
    if (!allImages) {
      toast.error("Chỉ cho phép tải lên hình ảnh.");
      return;
    }

    setDocUploading(true);
    try {
      const urls = await Promise.all(
        files.map((file) =>
          uploadImage("tenant-photos", file, `doc-tenant-${tenant?.id ?? "new"}-`, true)
        )
      );
      setDocuments((prev) => [...prev, ...urls]);
      toast.success("Đã tải tài liệu lên thành công.");
    } catch (err) {
      console.error(err);
      toast.error("Tải tài liệu lên thất bại.");
    } finally {
      setDocUploading(false);
    }
  }

  async function handleDeleteDoc(url: string) {
    if (!window.confirm("Bạn có chắc chắn muốn xoá tài liệu này?")) return;
    try {
      await deleteImage("tenant-photos", url).catch((err) => {
        console.error("Storage delete fail:", err);
      });
      setDocuments((prev) => prev.filter((d) => d !== url));
      toast.success("Đã xoá tài liệu.");
      setViewDocIndex(null);
    } catch (err) {
      console.error(err);
      toast.error("Xoá tài liệu thất bại.");
    }
  }

  async function handleClearAllDocs() {
    if (documents.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xoá tất cả ${documents.length} tài liệu của người thuê này?`)) return;
    setDocUploading(true);
    try {
      await Promise.all(
        documents.map((url) =>
          deleteImage("tenant-photos", url).catch((err) => {
            console.error("Storage delete fail:", err);
          })
        )
      );
      setDocuments([]);
      toast.success("Đã xoá tất cả tài liệu.");
    } catch (err) {
      console.error(err);
      toast.error("Xoá tài liệu thất bại.");
    } finally {
      setDocUploading(false);
    }
  }

  // reset form whenever the dialog opens for a (different) tenant — prefer this
  // month's recorded name/phone (what the card shows) over the tenant record
  React.useEffect(() => {
    if (!open) return;
    setName(billName ?? tenant?.name ?? "");
    setPhone(billPhone ?? tenant?.phone ?? "");
    setMoveIn(tenant?.move_in_date ?? "");
    setNotes(tenant?.notes ?? "");
    setPhotoUrl(tenant?.photo_url ?? null);
    setCameraAccess(tenant?.camera_access ?? false);
    setDocuments(tenant?.documents ?? []);
    setBasePrice(defaultRent);
  }, [open, tenant, defaultRent, billName, billPhone]);

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
        documents: documents,
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

          {/* Documents Section */}
          <div className="border-t border-border pt-4">
             <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-foreground">Giấy tờ người thuê</span>
              <div className="flex items-center gap-3">
                {documents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllDocs}
                    className="text-xs font-semibold text-danger hover:underline"
                    disabled={docUploading}
                  >
                    Xoá tất cả
                  </button>
                )}
                {docUploading && (
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    Đang tải...
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {documents.map((docUrl, idx) => (
                <div
                  key={docUrl}
                  className="group relative h-16 w-16 cursor-pointer overflow-hidden rounded-xl border border-border bg-surface bg-no-repeat bg-center bg-cover shadow-sm hover:border-primary transition-all"
                  onClick={() => setViewDocIndex(idx)}
                  style={{ backgroundImage: `url(${docUrl})` }}
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  
                  {/* Delete button directly on thumbnail */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDoc(docUrl);
                    }}
                    className="absolute top-1 right-1 z-10 h-5 w-5 rounded-full bg-black/60 text-white hover:bg-danger transition-colors flex items-center justify-center border border-white/20"
                    aria-label="Xoá hình ảnh"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-muted hover:bg-surface hover:text-primary hover:border-primary transition-all">
                <Plus className="h-5 w-5" />
                <span className="text-[10px] font-bold mt-1">Thêm ảnh</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAddDocs}
                  disabled={docUploading}
                />
              </label>
            </div>
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

      {/* Document view & cycle dialog */}
      {viewDocIndex !== null && (
        <Dialog open={true} onOpenChange={() => setViewDocIndex(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between pr-6">
                <span>Tài liệu {viewDocIndex + 1}</span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-primary hover:bg-primary/10"
                    onClick={() => {
                      const currentUrl = documents[viewDocIndex];
                      if (currentUrl) {
                        downloadFile(currentUrl, `document-${viewDocIndex + 1}.webp`);
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Tải xuống
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-danger hover:bg-danger/10 hover:text-danger"
                    onClick={() => {
                      const currentUrl = documents[viewDocIndex];
                      if (currentUrl) {
                        handleDeleteDoc(currentUrl);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Xoá
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div
              className="relative mt-2 flex items-center justify-center bg-black/5 dark:bg-black/25 rounded-2xl p-4 min-h-[300px] select-none touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Image display */}
              {(() => {
                const currentUrl = documents[viewDocIndex];
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
              {documents.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/85 p-2 shadow-md hover:bg-surface text-foreground transition-colors"
                    onClick={() => setViewDocIndex((viewDocIndex - 1 + documents.length) % documents.length)}
                    aria-label="Tài liệu trước"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/85 p-2 shadow-md hover:bg-surface text-foreground transition-colors"
                    onClick={() => setViewDocIndex((viewDocIndex + 1) % documents.length)}
                    aria-label="Tài liệu sau"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    window.open(url, "_blank");
  }
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
