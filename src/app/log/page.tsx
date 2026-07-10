import { LiveLog } from "@/components/log/live-log";

// Standalone, chrome-free viewer (no AppShell). Still behind the owner session
// via proxy.ts, and always dark regardless of the app theme.
export const metadata = { title: "Nhật ký thay đổi — MH71" };

export default function LogPage() {
  return <LiveLog />;
}
