"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Flame, Crown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  id: number;
  username: string;
  displayName: string | null;
  avatar: string | null;
  country: string | null;
  points: number;
  streakCount: number;
  level: number;
  rank: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  userEntry: LeaderboardEntry | null;
}

const COUNTRIES = [
  { value: "NG", label: "Nigeria" },
  { value: "GH", label: "Ghana" },
  { value: "KE", label: "Kenya" },
  { value: "ZA", label: "South Africa" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "IN", label: "India" },
  { value: "PH", label: "Philippines" },
  { value: "BR", label: "Brazil" },
];

const PERIOD_LABELS: Record<string, string> = {
  alltime: "All Time",
  weekly: "This Week",
  monthly: "This Month",
};

function countryFlag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function getLevelProgress(points: number): number {
  return (points % 1000) / 10;
}

function LevelBadge({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/15 text-primary leading-none flex-shrink-0">
      Lv {level}
    </span>
  );
}

function LevelProgressBar({ points }: { points: number }) {
  const pct = getLevelProgress(points);
  return (
    <div className="w-full h-1 rounded-full bg-primary/10 overflow-hidden mt-1">
      <div
        className="h-full rounded-full bg-primary/50 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Avatar({ avatar, name, size = "md" }: { avatar: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();
  const sizeClass = size === "lg" ? "w-16 h-16 text-base" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  const fallback = (
    <div className={cn(sizeClass, "rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center font-bold border-2 border-primary/20 flex-shrink-0")}>
      {initials}
    </div>
  );
  if (!avatar || imgError) return fallback;
  return (
    <img
      src={avatar}
      alt={name}
      className={cn(sizeClass, "rounded-full object-cover border-2 border-primary/20 flex-shrink-0")}
      onError={() => setImgError(true)}
    />
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return (
    <span className="text-sm font-bold text-muted-foreground w-5 text-center">
      {rank}
    </span>
  );
}

function PodiumCard({ entry, position }: { entry: LeaderboardEntry; position: 1 | 2 | 3 }) {
  const heights = { 1: "h-28", 2: "h-20", 3: "h-16" };
  const colors = {
    1: "from-yellow-400/20 to-yellow-600/10 border-yellow-400/40",
    2: "from-slate-300/20 to-slate-400/10 border-slate-300/40",
    3: "from-amber-500/20 to-amber-700/10 border-amber-500/40",
  };
  const iconColors = { 1: "text-yellow-500", 2: "text-slate-400", 3: "text-amber-600" };

  const name = entry.displayName || entry.username;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar avatar={entry.avatar} name={name} size="lg" />
        <span className={cn("absolute -top-2 -right-2", iconColors[position])}>
          {position === 1 ? <Crown className="w-5 h-5" /> : <Medal className="w-5 h-5" />}
        </span>
      </div>
      <p className="text-xs font-semibold text-center max-w-[80px] truncate">{name}</p>
      <div className="flex items-center gap-1 justify-center">
        <LevelBadge level={entry.level} />
        {entry.country && (
          <span className="text-sm leading-none">{countryFlag(entry.country)}</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground font-medium">
        {entry.points.toLocaleString()} pts
      </p>
      <div
        className={cn(
          "w-20 rounded-t-lg border bg-gradient-to-t flex items-end justify-center pb-2",
          heights[position],
          colors[position]
        )}
      >
        <span className="text-lg font-black text-muted-foreground">#{position}</span>
      </div>
    </div>
  );
}

function EntryRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const name = entry.displayName || entry.username;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
        isCurrentUser
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-muted/50"
      )}
    >
      <div className="w-8 flex items-center justify-center flex-shrink-0">
        <RankBadge rank={entry.rank} />
      </div>

      <Avatar avatar={entry.avatar} name={name} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm truncate">{name}</p>
          <LevelBadge level={entry.level} />
          {isCurrentUser && (
            <Badge variant="outline" className="text-xs border-primary text-primary px-1.5 py-0 flex-shrink-0">
              You
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <p className="text-xs text-muted-foreground">@{entry.username}</p>
          {entry.country && (
            <span className="text-xs leading-none">{countryFlag(entry.country)}</span>
          )}
        </div>
        <LevelProgressBar points={entry.points} />
      </div>

      {entry.streakCount > 0 && (
        <div className="flex items-center gap-1 text-orange-500 text-xs font-semibold flex-shrink-0">
          <Flame className="w-3.5 h-3.5" />
          {entry.streakCount}
        </div>
      )}

      <div className="text-right flex-shrink-0">
        <p className="font-bold text-sm">{entry.points.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">points</p>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"alltime" | "weekly" | "monthly">("alltime");
  const [country, setCountry] = useState("");

  const queryParams = new URLSearchParams({ period });
  if (country) queryParams.set("country", country);

  const { data, isLoading, error } = useQuery<LeaderboardResponse, Error>({
    queryKey: ["/api/leaderboard", period, country],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?${queryParams.toString()}`, {
        credentials: "include",
      });
      if (res.status === 403) throw Object.assign(new Error("disabled"), { status: 403 });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    refetchInterval: 60_000,
    retry: (failureCount, err) => (err as any)?.status === 403 ? false : failureCount < 2,
  });

  const isDisabled = (error as any)?.status === 403;
  const entries = data?.entries ?? [];
  const userEntry = data?.userEntry ?? null;
  const top3 = entries.slice(0, 3);
  const showUserPinned = !!userEntry;

  if (isDisabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm px-4">
          <Trophy className="w-14 h-14 text-muted-foreground/30 mx-auto" />
          <h2 className="text-xl font-bold">Leaderboard Unavailable</h2>
          <p className="text-muted-foreground text-sm">
            The leaderboard has been temporarily disabled by the admin. Check back later!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-500" />
            <h1 className="text-2xl font-bold">Leaderboard</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            See how you rank against other creators
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 flex-1">
                {(["alltime", "weekly", "monthly"] as const).map((p) => (
                  <Button
                    key={p}
                    variant={period === p ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setPeriod(p)}
                  >
                    {PERIOD_LABELS[p]}
                  </Button>
                ))}
              </div>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-full sm:w-44 h-9">
                  <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Podium */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-center gap-4 items-end">
                {[2, 1, 3].map((i) => (
                  <Skeleton key={i} className="w-20 h-32 rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : top3.length >= 1 ? (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm text-center text-muted-foreground font-medium">
                {PERIOD_LABELS[period]} Top Earners
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-6">
              <div className="flex justify-center items-end gap-2 sm:gap-4">
                {top3[1] && (
                  <PodiumCard entry={top3[1]} position={2} />
                )}
                {top3[0] && (
                  <PodiumCard entry={top3[0]} position={1} />
                )}
                {top3[2] && (
                  <PodiumCard entry={top3[2]} position={3} />
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Rankings List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Rankings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-1">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No rankings yet</p>
                <p className="text-sm">Complete tasks to appear on the leaderboard!</p>
              </div>
            ) : (
              <>
                {entries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    isCurrentUser={entry.id === user?.id}
                  />
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* User rank pinned at bottom (if outside top 50) */}
        {showUserPinned && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-2 font-medium px-1">Your Rank</p>
              <EntryRow entry={userEntry!} isCurrentUser={true} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
