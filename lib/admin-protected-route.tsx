"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminStatus {
  authenticated: boolean;
  isAdmin: boolean;
  role: string | null;
}

/**
 * Client-side admin guard.
 *
 * middleware.ts is the real gate, this exists so the UI doesn't flash content
 * during client navigations and so a session that expires mid-visit bounces
 * cleanly instead of firing a wall of 401s.
 *
 * Two things were wrong here before:
 *  - it called /api/admin/status, which did not exist, so every load 404'd,
 *    threw in .json(), hit the catch, and redirected to /admin/login forever;
 *  - it required role === "superadmin", locking out the "admin" role that
 *    requireAdmin() on the API side happily accepts.
 */
export function AdminProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/status", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return (await res.json()) as AdminStatus;
      })
      .then((data) => {
        if (cancelled) return;
        setIsAdmin(data.isAdmin === true);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsAdmin(false);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoading && isAdmin === false) {
      router.replace("/admin/login");
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="sr-only">Checking admin access…</span>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // redirecting
  }

  return <>{children}</>;
}
