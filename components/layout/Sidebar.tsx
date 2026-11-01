"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CheckSquare,
  Award,
  Share2,
  Settings,
  ChevronLeft,
  CreditCard,
  Megaphone,
  GraduationCap,
  Trophy,
  Store,
  QrCode,
  UserCircle,
  Users,
} from "lucide-react";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useBrand } from "@/hooks/use-brand";
import MobileBottomNav from "./MobileBottomNav";
import MobileHeader from "./MobileHeader";

interface NavEntry {
  icon: LucideIcon;
  label: string;
  href: string;
  /** data-tutorial anchor used by the walkthrough (components/tutorial). */
  tutorial?: string;
  show?: boolean;
}

function NavItem({ item, active, collapsed }: { item: NavEntry; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <li data-tutorial={item.tutorial}>
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
          collapsed && "justify-center px-0",
          active
            ? "bg-gradient-to-r from-purple-600/10 to-pink-600/10 text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-purple-600 to-pink-600" />}
        <Icon className={cn("h-[19px] w-[19px] shrink-0 transition-colors", active ? "text-purple-600 dark:text-purple-400" : "group-hover:text-foreground")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const brand = useBrand();
  const { menuOn } = useAppSettings();
  const username = user?.username || "me";
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Mobile: top header + bottom tab bar instead of a sidebar.
  if (isMobile) {
    return (
      <>
        <MobileHeader />
        <div className="md:hidden" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 56px)" }} />
        <MobileBottomNav />
      </>
    );
  }

  const groups: { heading: string; items: NavEntry[] }[] = [
    {
      heading: "Earn",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
        { icon: CheckSquare, label: "Tasks", href: "/tasks", tutorial: "tasks-link", show: menuOn("tasks") },
        { icon: GraduationCap, label: "Classroom", href: "/classroom", show: menuOn("classroom") },
      ],
    },
    {
      heading: "Rewards",
      items: [
        { icon: Award, label: "Rewards", href: "/rewards", tutorial: "rewards-link", show: menuOn("rewards") },
        { icon: Share2, label: "Referral", href: "/referral", tutorial: "referral-link", show: menuOn("referral") },
        { icon: Trophy, label: "Leaderboard", href: "/leaderboard", show: menuOn("leaderboard") },
        { icon: CreditCard, label: "Payments", href: "/payments", show: menuOn("payments") },
      ],
    },
    {
      heading: "Grow",
      items: [
        { icon: Megaphone, label: "Promote Me", href: "/promote-me", show: menuOn("promote_me") },
        { icon: Store, label: "Marketplace", href: "/marketplace", show: menuOn("marketplace") },
        { icon: Users, label: "Community", href: "/feed", show: menuOn("community") },
        { icon: QrCode, label: "Tools", href: "/tools", show: menuOn("tools") },
      ],
    },
    {
      heading: "Account",
      items: [
        { icon: UserCircle, label: "My Profile", href: `/profile/${username}`, show: menuOn("profile") },
        { icon: Settings, label: "Settings", href: "/settings", tutorial: "settings-link" },
      ],
    },
  ];

  const level = user?.level ?? 1;
  const progress = user?.progress ?? 0;
  const name = user?.displayName || user?.username || "";

  return (
    <aside
      className={cn(
        // Pinned to the viewport (sticky + h-screen), so the nav and legal links
        // stay reachable on long pages instead of growing with the content.
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-border/60 bg-background/95 backdrop-blur transition-[width] duration-300",
        collapsed ? "w-[76px]" : "w-64"
      )}
      data-tutorial="sidebar"
    >
      <div className={cn("flex items-center gap-2 px-4 py-4", collapsed ? "justify-center" : "justify-between")}>
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <Image src="/logo-128.webp" alt="" width={36} height={36} className="rounded-xl shadow-sm" />
          {!collapsed && <span className="truncate bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-lg font-extrabold text-transparent">{brand.name}</span>}
        </Link>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Collapse sidebar" aria-label="Collapse sidebar">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed ? (
        <button onClick={() => setCollapsed(false)} className="mx-auto mb-2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Expand sidebar" aria-label="Expand sidebar">
          <ChevronLeft className="h-4 w-4 rotate-180" />
        </button>
      ) : (
        user && (
          <Link href="/rewards" className="mx-3 mb-3 block rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 p-3.5 text-white shadow-md transition-transform hover:scale-[1.01]">
            <div className="flex items-center justify-between text-xs text-white/80">
              <span className="truncate">{name}</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 font-semibold text-white">Lv {level}</span>
            </div>
            <p className="mt-1 text-xl font-bold tabular-nums">{user.points.toLocaleString()} pts</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
            </div>
          </Link>
        )
      )}

      {/* min-h-0 lets the list scroll on short screens instead of pushing the footer off. */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 scrollbar-hide" aria-label="Main">
        {groups.map((g) => {
          const items = g.items.filter((i) => i.show !== false);
          if (!items.length) return null;
          return (
            <div key={g.heading} className="mb-4">
              {!collapsed && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{g.heading}</p>}
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <NavItem key={item.href} item={item} collapsed={collapsed} active={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))} />
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border/50 px-4 py-3">
        <div className={cn("flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground", collapsed && "flex-col items-center")}>
          <Link href="/terms" className="hover:text-foreground">{collapsed ? "T&C" : "Terms"}</Link>
          <Link href="/privacy" className="hover:text-foreground">{collapsed ? "PP" : "Privacy"}</Link>
          <button onClick={() => window.dispatchEvent(new Event("open-cookie-consent"))} className="text-left hover:text-foreground">
            {collapsed ? "CK" : "Cookies"}
          </button>
        </div>
      </div>
    </aside>
  );
}
