import { LoginForm } from "@/components/auth/login-form";
import { Building2 } from "lucide-react";

export const metadata = { title: "Đăng nhập — MH71" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
            <Building2 className="h-8 w-8" />
          </span>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">MH71</h1>
            <p className="mt-1 text-muted">Quản lý nhà trọ</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
