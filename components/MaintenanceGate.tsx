"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Construction } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Reachable during maintenance: admins need the panel to switch it off, and
// people need to be able to sign in (an admin signing in) and read the legal pages.
const OPEN_PATHS = ["/admin", "/auth", "/login", "/privacy", "/terms", "/reset-password", "/verify-email"];

/** Shows a "back soon" screen to members while maintenance_mode is on. */
export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const { data } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"], staleTime: 10_000 });

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const open = OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (data?.maintenance_mode !== "true" || isAdmin || open) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-background to-pink-50 p-6 dark:from-purple-950/20 dark:to-pink-950/20">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-xl">
          <Construction className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">We&apos;ll be right back</h1>
        <p className="mt-3 text-muted-foreground">
          4LO4LO is getting some upgrades. Your points, tasks and streak are safe. Please check back in a little while.
        </p>
      </div>
    </div>
  );
}
