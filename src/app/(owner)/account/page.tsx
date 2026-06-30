import { AccountCard } from "@/components/account/account-card";

export default function AccountPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-extrabold tracking-tight">Tài khoản</h1>
      <AccountCard />
    </div>
  );
}
