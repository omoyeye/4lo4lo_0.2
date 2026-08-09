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
}

export interface AdminNavGroup {
  heading: string;
  items: AdminSection[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    heading: "People",
    items: [
      { id: "users", label: "Users", icon: Users, hint: "Accounts, roles, points" },
      { id: "admins", label: "Admins", icon: UserCog, hint: "Who can access this panel" },
      { id: "referralTiers", label: "Referral Tiers", icon: Trophy, hint: "Tier thresholds and rewards" },
    ],
  },
  {
    heading: "Work",
    items: [
      { id: "tasks", label: "Tasks", icon: Award, hint: "Create and edit tasks" },
      { id: "classroom", label: "Classroom", icon: GraduationCap, hint: "Lessons and videos" },
    ],
  },
  {
    heading: "Money",
    items: [
      { id: "payments", label: "Payment Requests", icon: Wallet, hint: "Approve withdrawals" },
      { id: "requests", label: "Promotion Requests", icon: DollarSign, hint: "Paid promotion queue" },
      { id: "promotions", label: "Promotion Plans", icon: Rocket, hint: "Plans and pricing" },
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
      { id: "systemAnalytics", label: "System Analytics", icon: Activity, hint: "Growth and performance" },
    ],
  },
  {
    heading: "System",
    items: [
      { id: "email", label: "Email Center", icon: Mail, hint: "Bulk email and messages" },
      { id: "system", label: "Settings", icon: Settings, hint: "Feature flags and config" },
    ],
  },
];

export const ADMIN_SECTIONS: AdminSection[] = ADMIN_NAV.flatMap((g) => g.items);

export const DEFAULT_SECTION = "users";

export function isValidSection(id: string | null | undefined): boolean {
  return !!id && ADMIN_SECTIONS.some((s) => s.id === id);
}

export function sectionLabel(id: string): string {
  return ADMIN_SECTIONS.find((s) => s.id === id)?.label ?? "Admin";
}
