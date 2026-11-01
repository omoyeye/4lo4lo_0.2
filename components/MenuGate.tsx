"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { disabledMenuForPath } from "@/lib/menus";

/**
 * Pages whose menu a superadmin switched off (Admin → Menus) show a notice
 * instead, so an old bookmark or link doesn't open them. Admins still see the
 * page, so they can check it before switching it back on.
 */
export default function MenuGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const { raw } = useAppSettings();

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const off = isAdmin ? null : disabledMenuForPath(pathname, raw);
  if (!off) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-background to-pink-50 p-6 dark:from-purple-950/20 dark:to-pink-950/20">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <EyeOff className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">{off.label} is turned off</h1>
        <p className="mt-2 text-muted-foreground">This part of 4LO4LO isn&apos;t available right now. Please check back later.</p>
        <Button asChild className="mt-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <Link href={user ? "/dashboard" : "/"}>{user ? "Back to dashboard" : "Go to the home page"}</Link>
        </Button>
      </div>
    </div>
  );
}
