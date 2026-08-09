"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminProtectedRoute } from "@/lib/admin-protected-route";
import { AdminShell } from "@/components/admin/AdminShell";
import { Loader2 } from "lucide-react";

/**
 * Admin chrome wrapper.
 *
 * /admin/login must render bare, it is the page you land on when you are NOT
 * authorized, so wrapping it in the guard would loop, and showing it the admin
 * sidebar would be nonsense.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <AdminProtectedRoute>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </AdminProtectedRoute>
  );
}
