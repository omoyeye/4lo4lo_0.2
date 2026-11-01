"use client";

import { useState, useEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import MaintenanceGate from "@/components/MaintenanceGate";
import { AuthProvider } from "@/hooks/use-auth";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { AppSettingsProvider } from "@/contexts/AppSettingsContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import TutorialOverlay from "@/components/tutorial/TutorialOverlay";
import { NewUserTutorialPrompt } from "@/components/tutorial/TutorialTrigger";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { OfflineFallback } from "@/components/OfflineFallback";
import { usePWAAnalytics } from "@/hooks/use-pwa-analytics";
import { initBackgroundSync } from "@/lib/background-sync";
import { useAuth } from "@/hooks/use-auth";

/**
 * Daily check-in (streak, daily reward, milestone bonuses) and the device
 * report used for multi-account checks. Both run once per day/session.
 */
function DailyCheckin() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const key = `last_checkin_${user.id}`;
    const today = new Date().toISOString().split("T")[0];

    try {
      const sessionKey = `device_reported_${user.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        let deviceId = localStorage.getItem("4lo4lo.device");
        if (!deviceId) {
          deviceId = crypto.randomUUID().replace(/-/g, "");
          localStorage.setItem("4lo4lo.device", deviceId);
        }
        sessionStorage.setItem(sessionKey, "1");
        fetch("/api/user/device", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, platform: "web" }),
        }).catch(() => {});
      }
    } catch {
      /* storage unavailable (private mode): skip */
    }

    let last: string | null = null;
    try {
      last = localStorage.getItem(key);
    } catch {}
    if (last === today) return;

    fetch("/api/user/checkin", { method: "POST", credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        try {
          localStorage.setItem(key, today);
        } catch {}
        const c = data.checkIn;
        queryClient.invalidateQueries({ queryKey: ["/api/user/checkin"] });
        if (c?.checkedInNow) {
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          const earned = (c.pointsAwarded || 0) + (c.bonusAwarded || 0);
          toast({
            title: `🔥 Day ${c.streak} streak${earned > 0 ? ` · +${earned} points` : ""}`,
            description: c.bonusAwarded
              ? `Streak bonus unlocked! Come back tomorrow to keep it going.`
              : c.nextMilestone
                ? `${c.nextMilestone.daysLeft} more day${c.nextMilestone.daysLeft === 1 ? "" : "s"} to a +${c.nextMilestone.bonusPoints} bonus.`
                : "Come back tomorrow to keep your streak.",
          });
        }
      })
      .catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
                <MaintenanceGate>{children}</MaintenanceGate>
                <Toaster />
                <ServiceWorkerRegistrar />
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
