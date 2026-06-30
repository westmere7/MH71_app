"use client";

import * as React from "react";
import { Loader2, Camera, UserRound, KeyRound, Check } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useAccount } from "@/lib/account";
import { uploadImage } from "@/lib/upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { toast } from "sonner";

export function AccountCard() {
  const account = useAccount();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [name, setName] = React.useState("");
  const [savingName, setSavingName] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [savingPw, setSavingPw] = React.useState(false);

  // seed the name field once the account loads
  React.useEffect(() => {
    if (account) setName(account.displayName ?? "");
  }, [account?.displayName]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!account) {
    return (
      <Card>
        <CardHeader className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-primary" />
          <CardTitle>Tài khoản</CardTitle>
        </CardHeader>
        <CardContent>
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </CardContent>
      </Card>
    );
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage("tenant-photos", file, "avatars/");
      const { error } = await getSupabaseBrowser().auth.updateUser({ data: { avatar_url: url } });
      if (error) throw error;
      toast.success("Đã cập nhật ảnh đại diện");
    } catch {
      toast.error("Không tải được ảnh. Thử lại.");
    } finally {
      setUploading(false);
    }
  }

  async function saveName() {
    const next = name.trim();
    setSavingName(true);
    try {
      const { error } = await getSupabaseBrowser().auth.updateUser({
        data: { display_name: next },
      });
      if (error) throw error;
      toast.success("Đã lưu tên hiển thị");
    } catch {
      toast.error("Lưu không thành công.");
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword() {
    if (pw.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (pw !== pw2) {
      toast.error("Mật khẩu nhập lại không khớp.");
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await getSupabaseBrowser().auth.updateUser({ password: pw });
      if (error) throw error;
      setPw("");
      setPw2("");
      toast.success("Đã đổi mật khẩu");
    } catch {
      toast.error("Đổi mật khẩu không thành công.");
    } finally {
      setSavingPw(false);
    }
  }

  const nameChanged = name.trim() !== (account.displayName ?? "");

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <UserRound className="h-5 w-5 text-primary" />
        <CardTitle>Tài khoản</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* avatar + identity */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="group relative rounded-full focus:outline-none"
            aria-label="Đổi ảnh đại diện"
          >
            <Avatar name={account.name} photoUrl={account.avatarUrl} size={64} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </span>
          </button>
          <div className="min-w-0">
            <div className="truncate text-base font-bold">{account.name}</div>
            <div className="truncate text-sm text-muted">{account.email}</div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickAvatar}
          />
        </div>

        {/* display name */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="display-name">Tên hiển thị</Label>
          <div className="flex gap-2">
            <Input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên của bạn"
              maxLength={40}
            />
            <Button onClick={saveName} disabled={savingName || !nameChanged} className="shrink-0">
              {savingName ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              Lưu
            </Button>
          </div>
          <p className="text-sm text-muted">Tên này hiển thị thay cho email trong ứng dụng.</p>
        </div>

        {/* change password */}
        <div className="flex flex-col gap-2 border-t border-border pt-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted" />
            <span className="text-sm font-semibold">Đổi mật khẩu</span>
          </div>
          <Input
            type="password"
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
          />
          <Input
            type="password"
            autoComplete="new-password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Nhập lại mật khẩu mới"
          />
          <Button
            variant="outline"
            onClick={savePassword}
            disabled={savingPw || !pw || !pw2}
            className="self-start"
          >
            {savingPw ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
            Đổi mật khẩu
          </Button>
        </div>

        {/* sign out */}
        <div className="border-t border-border pt-5">
          <SignOutButton className="border-2 border-border" />
        </div>
      </CardContent>
    </Card>
  );
}
