import type { LucideIcon } from "lucide-react";
import {
  Users,
  UserCog,
  Award,
  GraduationCap,
  DollarSign,
  Rocket,
  Wallet,
  Star,
  Flame,
  Store,
  Megaphone,
  BarChart,
  Activity,
  Settings,
  Mail,
  Trophy,
  LayoutDashboard,
  ImageUp,
  ShieldAlert,
  History,
  Palette,
  LayoutList,
} from "lucide-react";

/**
 * The single source of truth for admin navigation.
 *
 * The panel used to have two competing navs bound to the same state: a 9-item
 * sidebar and a 12-item tab strip. Seven destinations appeared in both under
 * different labels, two (analytics, systemAnalytics) existed only in the
 * sidebar with no matching tab so selecting them highlighted nothing, and five
 * (classroom, badges, streakSettings, marketplace, ads) existed only in the tab
 * strip and were invisible from the sidebar. Referral tiers were reachable from
 * neither.
 *
 * Every section is now declared exactly once, here, and rendered by one nav.
 */

export interface AdminSection {
  /** URL segment and Tabs value. */
  id: string;
  label: string;
  icon: LucideIcon;
  /** Short hint shown in the mobile drawer. */
  hint?: string;
  /**
   * Money, rewards, platform config and admin accounts: superadmins only.
   * Mirrors requireSuperadmin() on the matching API routes; the menu hides
   * these for admins and the page refuses to render them.
   */
  superadminOnly?: boolean;
}

export interface AdminNavGroup {
  heading: string;
  items: AdminSection[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    heading: "Overview",
    items: [{ id: "overview", label: "Dashboard", icon: LayoutDashboard, hint: "Key numbers and work queues" }],
  },
  {
    heading: "People",
    items: [
      { id: "users", label: "Users", icon: Users, hint: "Accounts, roles, points" },
      { id: "admins", label: "Admin Team", icon: UserCog, hint: "Who can access this panel", superadminOnly: true },
      { id: "referralTiers", label: "Referral Tiers", icon: Trophy, hint: "Tier thresholds and rewards", superadminOnly: true },
    ],
  },
  {
    heading: "Work",
    items: [
      { id: "tasks", label: "Tasks", icon: Award, hint: "Create and edit tasks" },
      { id: "proofs", label: "Task Proofs", icon: ImageUp, hint: "Approve screenshots before points are paid" },
      { id: "classroom", label: "Classroom", icon: GraduationCap, hint: "Lessons and videos" },
    ],
  },
  {
    heading: "Money",
    items: [
      { id: "payments", label: "Payment Requests", icon: Wallet, hint: "Approve withdrawals", superadminOnly: true },
      { id: "requests", label: "Promotion Requests", icon: DollarSign, hint: "Paid promotion queue" },
      { id: "promotions", label: "Promotion Plans", icon: Rocket, hint: "Plans and pricing", superadminOnly: true },
    ],
  },
  {
    heading: "Engagement",
    items: [
      { id: "badges", label: "Badges", icon: Star, hint: "Achievement badges" },
      { id: "streakSettings", label: "Streaks", icon: Flame, hint: "Login streak rewards" },
      { id: "marketplace", label: "Marketplace", icon: Store, hint: "Listings and comments" },
      { id: "ads", label: "Ads", icon: Megaphone, hint: "Ad placements" },
    ],
  },
  {
    heading: "Insights",
    items: [
      { id: "analytics", label: "Task Clicks", icon: BarChart, hint: "Click-through and conversion" },
      { id: "systemAnalytics", label: "System Analytics", icon: Activity, hint: "Growth and performance", superadminOnly: true },
      { id: "flags", label: "Fraud Flags", icon: ShieldAlert, hint: "Accounts sharing a device or network" },
      { id: "activity", label: "Activity Log", icon: History, hint: "Who did what in the admin panel", superadminOnly: true },
    ],
  },
  {
    heading: "System",
    items: [
      { id: "email", label: "Email Center", icon: Mail, hint: "Bulk email and messages", superadminOnly: true },
      { id: "system", label: "Settings", icon: Settings, hint: "Feature flags and config", superadminOnly: true },
      { id: "menus", label: "Menus", icon: LayoutList, hint: "Turn member menus on or off", superadminOnly: true },
      { id: "brand", label: "Brand", icon: Palette, hint: "Logo, legal details and social links", superadminOnly: true },
    ],
  },
];

export const ADMIN_SECTIONS: AdminSection[] = ADMIN_NAV.flatMap((g) => g.items);

export const DEFAULT_SECTION = "overview";

export function sectionHint(id: string): string | undefined {
  return ADMIN_SECTIONS.find((s) => s.id === id)?.hint;
}

export function isValidSection(id: string | null | undefined): boolean {
  return !!id && ADMIN_SECTIONS.some((s) => s.id === id);
}

export function sectionLabel(id: string): string {
  return ADMIN_SECTIONS.find((s) => s.id === id)?.label ?? "Admin";
}

/** Nav groups this role may see (empty groups dropped). */
export function navForRole(role: string | null | undefined): AdminNavGroup[] {
  const isSuper = role === "superadmin";
  return ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => isSuper || !i.superadminOnly) })).filter((g) => g.items.length > 0);
}

export function isSuperadminSection(id: string): boolean {
  return ADMIN_SECTIONS.find((s) => s.id === id)?.superadminOnly === true;
}
