"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import AdminNotificationBell from "@/components/AdminNotificationBell";
import { SimpleThemeToggle } from "@/components/theme-toggle";
import { Menu, LogOut, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { navForRole, DEFAULT_SECTION, isValidSection, sectionHint, sectionLabel } from "@/components/admin/AdminNav";
import { RoleBadge, UserAvatar } from "@/components/admin/kit";

/**
 * Admin chrome: one grouped sidebar, one header, responsive.
 *
 * The active section lives in the URL (?section=), so admin views are
 * linkable, bookmarkable and correct under the back button. Work queues show
 * a live count in the sidebar so pending items are visible from anywhere.
 */

function useQueueCounts(isSuperadmin: boolean) {
  const { data: payouts } = useQuery<{ status: string }[]>({
    queryKey: ["/api/admin/payouts"],
    enabled: isSuperadmin,
    queryFn: async () => {
      const res = await fetch("/api/admin/payouts", { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    refetchInterval: 60_000,
  });
  const { data: requests } = useQuery<{ status: string }[]>({
    queryKey: ["promotionRequests"],
    queryFn: async () => {
      const res = await fetch("/api/promotion/requests", { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    refetchInterval: 60_000,
  });
  const { data: proofs } = useQuery<{ proofs: unknown[] }>({
    queryKey: ["adminProofs", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/admin/proofs?status=pending", { credentials: "include" });
      return res.ok ? res.json() : { proofs: [] };
    },
    refetchInterval: 60_000,
  });
  return {
    proofs: proofs?.proofs?.length ?? 0,
    payments: Array.isArray(payouts) ? payouts.filter((p) => p.status === "pending").length : 0,
    requests: Array.isArray(requests) ? requests.filter((r) => r.status === "pending").length : 0,
  } as Record<string, number>;
}

function NavList({ active, onNavigate, counts, role }: { active: string; onNavigate: (id: string) => void; counts: Record<string, number>; role?: string | null }) {
  return (
    <nav className="space-y-6" aria-label="Admin sections">
      {navForRole(role).map((group) => (
        <div key={group.heading}>
          <h3 className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{group.heading}</h3>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              const count = counts[item.id] ?? 0;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-gradient-to-r from-purple-600/10 to-pink-600/10 font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {isActive && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-gradient-to-b from-purple-600 to-pink-600" />}
                  <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-purple-600 dark:text-purple-400" : "")} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const counts = useQueueCounts(user?.role === "superadmin");

  const raw = searchParams.get("section");
  // /admin/email is its own route; highlight its nav entry there.
  const active = pathname === "/admin/email" ? "email" : isValidSection(raw) ? (raw as string) : DEFAULT_SECTION;

  const navigate = (id: string) => {
    setMobileOpen(false);
    router.push(`/admin?section=${id}`, { scroll: true });
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch {
      // Fall through to the redirect regardless, the cookie may already be gone.
    }
    router.push("/admin/login");
    router.refresh();
  };

  const sidebarBody = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <Image src="/logo-128.webp" alt="" width={38} height={38} className="rounded-xl shadow-sm" />
        <div className="min-w-0">
          <p className="truncate bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-lg font-extrabold leading-tight text-transparent">4LO4LO</p>
          <p className="truncate text-xs font-medium text-muted-foreground">Admin console</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-hide">
        <NavList active={active} onNavigate={navigate} counts={counts} role={user?.role} />
      </div>

      <div className="border-t p-3">
        {user && (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
            <UserAvatar name={user.username} src={user.avatar} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.username}</p>
              <RoleBadge role={user.role} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            View site
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30 dark:bg-background">
      <aside className="hidden w-[264px] shrink-0 border-r bg-card lg:flex">{sidebarBody}</aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button className="rounded-lg p-2 hover:bg-muted lg:hidden" aria-label="Open admin navigation">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                {sidebarBody}
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">Admin · {sectionHint(active) ?? "Control panel"}</p>
              <h1 className="truncate text-lg font-bold leading-tight">{sectionLabel(active)}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <SimpleThemeToggle />
            <AdminNotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
