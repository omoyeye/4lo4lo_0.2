"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/status", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setIsAdmin(data.isAdmin === true && data.role === "superadmin");
        setIsLoading(false);
      })
      .catch(() => {
        setIsAdmin(false);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/admin/login");
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // rendering null while redirecting
  }

  return <>{children}</>;
}
