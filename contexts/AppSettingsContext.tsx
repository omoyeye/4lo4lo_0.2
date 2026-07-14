"use client";

import { createContext, useContext, useCallback, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useWebSocketSubscription, WebSocketMessage } from "@/contexts/WebSocketContext";

interface AppSettings {
  promote_me_enabled: boolean;
  classroom_enabled: boolean;
  leaderboard_enabled: boolean;
  leaderboard_limit: number;
  max_open_listings: number;
}

interface AppSettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  refetch: () => void;
}

const defaultSettings: AppSettings = {
  promote_me_enabled: true,
  classroom_enabled: true,
  leaderboard_enabled: true,
  leaderboard_limit: 50,
  max_open_listings: 3,
};

const AppSettingsContext = createContext<AppSettingsContextType | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });

  const handleWsMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === "settings_updated") {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    }
  }, []);

  useWebSocketSubscription(handleWsMessage);

  const settings: AppSettings = {
    promote_me_enabled: data?.promote_me_enabled !== "false",
    classroom_enabled: data?.classroom_enabled !== "false",
    leaderboard_enabled: data?.leaderboard_enabled !== "false",
    leaderboard_limit: parseInt(data?.leaderboard_limit ?? "50", 10) || 50,
    max_open_listings: parseInt(data?.max_open_listings ?? "3", 10) || 3,
  };

  return (
    <AppSettingsContext.Provider value={{ settings, isLoading, refetch }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    return { settings: defaultSettings, isLoading: false, refetch: () => {} };
  }
  return context;
}
