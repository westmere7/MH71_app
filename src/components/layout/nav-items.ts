import { LayoutDashboard, Users, Coins, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  highlight?: boolean; // most-used section — visually emphasized
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/tenants", label: "Phòng & Khách", icon: Users, highlight: true },
  { href: "/settings", label: "Cài đặt", icon: Settings },
  { href: "/gia", label: "Thiết lập giá", icon: Coins },
];

// items shown in the mobile bottom bar
export const MOBILE_NAV = NAV_ITEMS;
