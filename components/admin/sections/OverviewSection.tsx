"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Award, CheckCircle2, Database, DollarSign, LayoutDashboard, Rocket, Users, Wallet, XCircle } from "lucide-react";
import { adminFetch, EmptyState, PageHeader, Panel, StatCard, StatusPill, platformLabel } from "@/components/admin/kit";

interface AdminStats {
  totalUsers: number;
  activeTasks: number;
  totalTasks: number;
  totalCompletions: number;
  totalPromotionRequests: number;
  totalPromotionRevenue: string;
  analytics: {
    userGrowth: Record<string, number>;
    taskCompletionRate: { taskId: number; title: string; completions: number }[];
    topPlatforms: Record<string, number>;
  };
}

interface DbStatus {
  connected: boolean;
  status: string;
  lastChecked: string;
  error?: string;
}

function lastNDays(n: number) {
  const days: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    days.push(x.toISOString().slice(0, 10));
  }
  return days;
}

export function OverviewSection() {
  const router = useRouter();
  const go = (section: string) => router.push(`/admin?section=${section}`);

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["adminStats"],
    queryFn: () => adminFetch("/api/admin/stats"),
    refetchInterval: 30_000,
  });
  const { data: db } = useQuery<DbStatus>({
    queryKey: ["dbStatus"],
    queryFn: () => adminFetch("/api/admin/system/db-status"),
    refetchInterval: 60_000,
    retry: false,
  });
  const { user } = useAuth();
  const isSuperadmin = user?.role === "superadmin";
  const { data: payouts = [] } = useQuery<{ status: string; amount: number }[]>({
    queryKey: ["/api/admin/payouts"],
    queryFn: () => adminFetch("/api/admin/payouts"),
    enabled: isSuperadmin,
  });
  const { data: requests = [] } = useQuery<{ status: string }[]>({
    queryKey: ["promotionRequests"],
    queryFn: () => adminFetch("/api/promotion/requests"),
  });

  const growth = useMemo(() => {
    const byDay = stats?.analytics?.userGrowth ?? {};
    return lastNDays(30).map((day) => ({ day: day.slice(5), signups: byDay[day] ?? 0 }));
  }, [stats]);
  const signups30 = growth.reduce((s, d) => s + d.signups, 0);

  const platforms = useMemo(
    () =>
      Object.entries(stats?.analytics?.topPlatforms ?? {})
        .map(([platform, count]) => ({ platform: platformLabel(platform), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    [stats]
  );

  const topTasks = useMemo(
    () => [...(stats?.analytics?.taskCompletionRate ?? [])].sort((a, b) => b.completions - a.completions).slice(0, 6),
    [stats]
  );
  const maxCompletions = topTasks[0]?.completions || 1;

  const pendingPayouts = Array.isArray(payouts) ? payouts.filter((p) => p.status === "pending") : [];
  const pendingRequests = Array.isArray(requests) ? requests.filter((r) => r.status === "pending").length : 0;

  return (
    <div className="space-y-6">
      <PageHeader icon={LayoutDashboard} title="Dashboard" description="What's happening across 4lo4lo right now." />

      {db && !db.connected && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="text-sm">
            <p className="font-semibold text-rose-900 dark:text-rose-200">The database is not responding</p>
            <p className="mt-0.5 break-all text-rose-800/90 dark:text-rose-300/90">{db.error ?? "Unknown error"}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Members" value={stats?.totalUsers?.toLocaleString() ?? "—"} icon={Users} tone="purple" hint={`+${signups30} in the last 30 days`} loading={isLoading} onClick={() => go("users")} />
        <StatCard label="Active tasks" value={stats ? `${stats.activeTasks}` : "—"} icon={Award} tone="sky" hint={stats ? `${stats.totalTasks} tasks in total` : undefined} loading={isLoading} onClick={() => go("tasks")} />
        <StatCard label="Task completions" value={stats?.totalCompletions?.toLocaleString() ?? "—"} icon={CheckCircle2} tone="emerald" hint="All time" loading={isLoading} onClick={() => go("analytics")} />
        <StatCard label="Promotion revenue" value={stats ? `$${Number(stats.totalPromotionRevenue).toLocaleString()}` : "—"} icon={DollarSign} tone="amber" hint={stats ? `${stats.totalPromotionRequests} requests` : undefined} loading={isLoading} onClick={() => go("requests")} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="New members" description="Sign-ups per day, last 30 days">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9333ea" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#db2777" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={4} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Area type="monotone" dataKey="signups" stroke="#9333ea" strokeWidth={2.5} fill="url(#signupFill)" name="Sign-ups" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Work queues" description="Items waiting on an admin">
          <div className="space-y-3">
            {isSuperadmin && <QueueRow icon={Wallet} label="Payout requests" count={pendingPayouts.length} sub={pendingPayouts.length ? `${pendingPayouts.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()} points requested` : "All caught up"} onClick={() => go("payments")} />}
            <QueueRow icon={Rocket} label="Promotion requests" count={pendingRequests} sub={pendingRequests ? "Waiting for approval" : "All caught up"} onClick={() => go("requests")} />
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Database</p>
                  <p className="text-xs text-muted-foreground">{db ? `Checked ${new Date(db.lastChecked).toLocaleTimeString()}` : "Checking..."}</p>
                </div>
              </div>
              {db && <StatusPill status={db.connected ? "active" : "failed"} label={db.connected ? "Healthy" : "Down"} />}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Tasks by platform" description="How the task catalogue is split">
          {platforms.length === 0 ? (
            <EmptyState title="No tasks yet" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platforms} layout="vertical" margin={{ left: 24, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="platform" width={90} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Bar dataKey="count" name="Tasks" fill="#a855f7" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Most completed tasks" description="All-time completions">
          {topTasks.length === 0 ? (
            <EmptyState title="No completions yet" />
          ) : (
            <ul className="space-y-3">
              {topTasks.map((t) => (
                <li key={t.taskId}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{t.title}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{t.completions.toLocaleString()}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-600" style={{ width: `${Math.max(4, (t.completions / maxCompletions) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function QueueRow({ icon: Icon, label, count, sub, onClick }: { icon: typeof Wallet; label: string; count: number; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted/60">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
      <span className={count > 0 ? "rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-2.5 py-0.5 text-xs font-bold text-white" : "text-sm text-muted-foreground"}>{count}</span>
    </button>
  );
}
