import { Table, BarChart3, Users, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/thong-ke", label: "Thống kê", icon: BarChart3 },
  { href: "/tenants", label: "Phòng thuê", icon: Users },
  { href: "/", label: "Tổng quan", icon: Table },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

// items shown in the mobile bottom bar
export const MOBILE_NAV = NAV_ITEMS;
