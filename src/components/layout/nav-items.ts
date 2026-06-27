import { LayoutDashboard, Users, Coins, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/tenants", label: "Phòng thuê", icon: Users },
  { href: "/settings", label: "Cài đặt", icon: Settings },
  { href: "/gia", label: "Thiết lập giá", icon: Coins },
];

// items shown in the mobile bottom bar
export const MOBILE_NAV = NAV_ITEMS;
