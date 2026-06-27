import { LayoutDashboard, Users, Coins, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/tenants", label: "Phòng & Khách", icon: Users },
  { href: "/settings", label: "Cài đặt", icon: Settings },
  { href: "/gia", label: "Thiết lập giá", icon: Coins },
] as const;

// items shown in the mobile bottom bar (4 max for thumb reach)
export const MOBILE_NAV = NAV_ITEMS;
