"use client";

import { useState, type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import AdminNotificationBell from "@/components/AdminNotificationBell";
import { SimpleThemeToggle } from "@/components/theme-toggle";
import { Shield, Menu, LogOut, ExternalLink } from "lucide-react";
import {
  ADMIN_NAV,
  DEFAULT_SECTION,
  isValidSection,
  sectionLabel,
} from "@/components/admin/AdminNav";

/**
 * Admin chrome: one grouped sidebar, one header, responsive.
 *
 * Layout problems this replaces:
 *  - two navs (a w-64 sidebar and a 12-tab strip) driving the same state, with
 *    different and partially non-overlapping destination lists;
 *  - a hard w-64 sidebar with no mobile treatment, so on a phone it consumed
 *    most of the viewport and the tab strip wrapped to three rows;
 *  - a Logout button positioned `absolute bottom-4` inside a parent that was
 *    never `relative`, so it anchored to the wrong ancestor and could float
 *    over content.
 *
 * The active section lives in the URL (?section=), so admin views are now
 * linkable, bookmarkable and correct under the back button.
 */

function NavList({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <nav className="space-y-6" aria-label="Admin sections">
      {ADMIN_NAV.map((group) => (
        <div key={group.heading}>
          <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.heading}
          </h3>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors text-left",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-secondary text-secondary-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
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

  const raw = searchParams.get("section");
  const active = isValidSection(raw) ? (raw as string) : DEFAULT_SECTION;

  const navigate = (id: string) => {
    setMobileOpen(false);
    router.push(`${pathname}?section=${id}`, { scroll: true });
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
      <div className="flex items-center gap-2 px-3 py-4">
        <Shield className="h-6 w-6 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="font-bold leading-tight truncate">Admin Control</p>
          <p className="text-xs text-muted-foreground truncate">4lo4lo</p>
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-2 py-4">
        <NavList active={active} onNavigate={navigate} />
      </ScrollArea>

      <Separator />

      {/* In normal flow at the end of a flex column, no absolute positioning. */}
      <div className="p-3 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => router.push("/dashboard")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          View site
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r bg-card">
        {sidebarBody}
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile drawer trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open admin navigation"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                {sidebarBody}
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Admin</p>
              <h1 className="text-lg font-semibold leading-tight truncate">
                {sectionLabel(active)}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <SimpleThemeToggle />
            <AdminNotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
