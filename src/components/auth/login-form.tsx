"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowser();
    const fail = () => {
      setError("Tên đăng nhập hoặc mật khẩu không đúng.");
      setLoading(false);
    };

    // Accept either a username or a full email. A bare username is resolved to
    // its email through the email_for_username RPC (see 0011_username_login.sql).
    const id = identifier.trim();
    let email = id;
    if (!id.includes("@")) {
      const { data, error } = await supabase.rpc("email_for_username", { uname: id });
      if (error || !data) {
        fail();
        return;
      }
      email = data as string;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      fail();
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="p-6 sm:p-7">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="identifier">Tên đăng nhập</Label>
            <Input
              id="identifier"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="tên đăng nhập"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-danger-surface px-3 py-2 text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            Đăng nhập
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
