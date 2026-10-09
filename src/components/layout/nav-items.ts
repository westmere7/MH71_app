import { Table, BarChart3, Users, Settings, Map as MapIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Settings as AppSettings } from "@/lib/supabase/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** shown only when this settings flag is on (experimental tabs) */
  flag?: "show_floor_plan";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/thong-ke", label: "Thống kê", icon: BarChart3 },
  { href: "/tenants", label: "Phòng thuê", icon: Users },
  { href: "/so-do", label: "Sơ đồ", icon: MapIcon, flag: "show_floor_plan" }, // experimental
  { href: "/", label: "Tổng quan", icon: Table },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

// items shown in the mobile bottom bar
export const MOBILE_NAV = NAV_ITEMS;

/** nav items minus experimental tabs whose settings flag is off */
export function visibleNavItems(settings: AppSettings | null | undefined): NavItem[] {
  return NAV_ITEMS.filter((i) => !i.flag || settings?.[i.flag] === true);
}
