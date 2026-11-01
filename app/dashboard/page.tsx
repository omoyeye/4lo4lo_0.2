"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Crown, Flame, GraduationCap, ListChecks, Share2, Sparkles, Star, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTaskNotifications } from "@/hooks/use-task-notifications";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { ProtectedRoute } from "@/lib/protected-route";
import type { Task, User as UserType, UserTask } from "@shared/schema.mysql";
import { EmptyState, MemberLayout, Section, StatTile } from "@/components/member/kit";
import { PlatformBadge } from "@/components/member/platform";
import DailyCheckInCard from "@/components/dashboard/DailyCheckInCard";
import ShareAchievementCard from "@/components/dashboard/ShareAchievementCard";
import LevelUpCelebration from "@/components/dashboard/LevelUpCelebration";
import EmailVerificationBanner from "@/components/account/EmailVerificationBanner";

interface DashboardData {
  user: UserType;
  taskCounts: { available: number; completed: number };
  pointsData: { total: number; daily: number };
  recentTasks: (UserTask & { task: Task })[];
  topEarners: UserType[];
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function DashboardContent() {
  const { user } = useAuth();
  useTaskNotifications();
  const { isConnected } = useWebSocket();

  // Live updates arrive over the socket; polling is only the fallback.
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", { userId: user?.id }],
    enabled: !!user?.id,
    refetchInterval: isConnected ? 300_000 : 60_000,
    refetchOnWindowFocus: true,
  });
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ["/api/tasks", { userId: user?.id }], enabled: !!user });

  const me = data?.user ?? user;
  const level = me?.level ?? 1;
  const progress = me?.progress ?? 0;
  const points = data?.pointsData?.total ?? me?.points ?? 0;

  // Level-up celebration when the level rises while the page is open.
  const prevLevel = useRef<number | null>(null);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  useEffect(() => {
    if (!data?.user) return;
    if (prevLevel.current !== null && data.user.level > prevLevel.current) setCelebrate(data.user.level);
    prevLevel.current = data.user.level;
  }, [data?.user]);

  const featured = [...tasks].sort((a, b) => b.points - a.points).slice(0, 4);
  const pending = me?.pendingPoints ?? 0;

  return (
    <MemberLayout>
      {celebrate !== null && <LevelUpCelebration newLevel={celebrate} onClose={() => setCelebrate(null)} />}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 via-purple-600 to-pink-600 p-6 text-white shadow-xl md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-white/5" />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="text-sm text-white/80">{greeting()},</p>
            <h1 className="text-2xl font-bold md:text-3xl">{me?.displayName || me?.username} 👋</h1>
            <p className="mt-6 text-sm text-white/80">Your balance</p>
            <p className="text-4xl font-extrabold tabular-nums md:text-5xl">
              {points.toLocaleString()} <span className="text-xl font-semibold text-white/85">pts</span>
            </p>
            {pending > 0 && <p className="mt-1 text-sm text-white/80">+{pending.toLocaleString()} pts waiting for proof review</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild className="rounded-xl bg-white text-purple-700 hover:bg-white/90">
                <Link href="/tasks">
                  <ListChecks className="mr-1.5 h-4 w-4" /> Find tasks
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href="/payments">
                  <Wallet className="mr-1.5 h-4 w-4" /> Withdraw
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href="/referral">
                  <Share2 className="mr-1.5 h-4 w-4" /> Invite friends
                </Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl p-4 backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.12)" }}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Level {level}</span>
              <span className="text-white/80">{progress}% to Level {level + 1}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-200 to-white transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-white/80">{1000 - Math.round(progress * 10)} more points to level up</p>
          </div>
        </div>
      </section>

      <EmailVerificationBanner />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tutorial="dashboard-stats">
        <StatTile label="Tasks available" value={data?.taskCounts?.available ?? "—"} icon={ListChecks} tone="sky" href="/tasks" />
        <StatTile label="Tasks completed" value={data?.taskCounts?.completed ?? "—"} icon={CheckCircle2} tone="emerald" />
        <StatTile label="Daily streak" value={`${me?.streakCount ?? 0} days`} icon={Flame} tone="amber" />
        <StatTile label="Level" value={level} icon={Star} tone="purple" hint={`${progress}% to next`} href="/rewards" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section
            title="Tasks for you"
            description="The best-paying tasks right now"
            action={
              <Button asChild variant="ghost" size="sm" className="rounded-lg">
                <Link href="/tasks">
                  See all <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            }
            bodyClassName="p-2 sm:p-3"
          >
            {featured.length === 0 ? (
              <EmptyState icon={ListChecks} title={isLoading ? "Loading tasks…" : "You're all caught up"} description={isLoading ? undefined : "New tasks are added regularly. We'll notify you when they arrive."} />
            ) : (
              <ul className="divide-y">
                {featured.map((t) => (
                  <li key={t.id}>
                    <Link href="/tasks" className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/60">
                      <PlatformBadge platform={t.platform} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{t.title}</p>
                        <p className="truncate text-xs capitalize text-muted-foreground">
                          {t.type} · {t.platform.replace("_", " ")}
                        </p>
                      </div>
                      <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-sm font-semibold text-purple-700 dark:text-purple-300">+{t.points}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Recent activity" bodyClassName="p-2 sm:p-3">
            {(data?.recentTasks ?? []).length === 0 ? (
              <EmptyState icon={Sparkles} title="No activity yet" description="Complete your first task and it will show up here." />
            ) : (
              <ul className="divide-y">
                {data!.recentTasks.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-3">
                    <PlatformBadge platform={r.task?.platform ?? ""} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.task?.title ?? "Task"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.completedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</p>
                    </div>
                    <span className={r.verificationStatus === "in_review" ? "text-xs font-medium text-amber-600" : "text-sm font-semibold text-emerald-600"}>
                      {r.verificationStatus === "in_review" ? "In review" : `+${r.pointsEarned ?? r.task?.points ?? 0}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <DailyCheckInCard />
          <ShareAchievementCard />

          <Section title="Top earners" action={<Crown className="h-4 w-4 text-amber-500" />} bodyClassName="p-3">
            {(data?.topEarners ?? []).length === 0 ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ol className="space-y-1">
                {data!.topEarners.slice(0, 5).map((e, i) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                    <span
                      className={
                        i === 0
                          ? "flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white"
                          : "flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground"
                      }
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{e.displayName || e.username}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">{e.points.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Link href="/classroom" className="flex items-center gap-3 rounded-2xl border bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 transition-colors hover:border-purple-300 dark:hover:border-purple-800">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Learn and earn</span>
              <span className="block text-sm text-muted-foreground">Free Classroom lessons pay bonus points.</span>
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </MemberLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
