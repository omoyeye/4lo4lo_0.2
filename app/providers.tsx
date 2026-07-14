"use client";

import { useState, useEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { AppSettingsProvider } from "@/contexts/AppSettingsContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import TutorialOverlay from "@/components/tutorial/TutorialOverlay";
import { NewUserTutorialPrompt } from "@/components/tutorial/TutorialTrigger";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { OfflineFallback } from "@/components/OfflineFallback";
import { usePWAAnalytics } from "@/hooks/use-pwa-analytics";
import { initBackgroundSync } from "@/lib/background-sync";
import { useAuth } from "@/hooks/use-auth";

/** Fires the daily login check-in (updates streak, awards badges). */
function DailyCheckin() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const key = `last_checkin_${user.id}`;
    const today = new Date().toISOString().split("T")[0];
    if ((typeof window !== 'undefined' ? localStorage.getItem(key) : null) === today) return;

    fetch("/api/user/checkin", { method: "POST", credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) (typeof window !== 'undefined' ? localStorage.setItem(key, today) : undefined);
      })
      .catch(() => {});
  }, [user?.id]);

  return null;
}

/** Initializes PWA features (analytics + background sync). */
function PWAInit() {
  usePWAAnalytics();
  useEffect(() => {
    initBackgroundSync();
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <AuthProvider>
          <WebSocketProvider>
            <AppSettingsProvider>
              <TutorialProvider>
                <PWAInit />
                <DailyCheckin />
                {children}
                <Toaster />
                <PWAInstallPrompt />
                <PWAUpdatePrompt />
                <OfflineFallback />
                <TutorialOverlay />
                <NewUserTutorialPrompt />
              </TutorialProvider>
            </AppSettingsProvider>
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
