"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3, CheckCircle2, Clock, Cpu, Database, MousePointerClick, RefreshCcw, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { adminFetch, EmptyState, LoadingRows, PageHeader, Pager, Panel, platformLabel, SearchInput, StatCard, StatusPill, usePagination } from "@/components/admin/kit";

/* ───────────────────────── Task clicks ───────────────────────── */

interface ClickRow {
  taskId: number;
  title: string;
  platform: string;
  totalClicks: number;
  uniqueUsers: number;
  conversionRate: number | string;
}

export function TaskClicksSection() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading, isFetching } = useQuery<ClickRow[]>({
    queryKey: ["taskClickAnalytics"],
    queryFn: () => adminFetch("/api/admin/analytics/task-clicks"),
    refetchInterval: 120_000,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...data].filter((r) => !q || r.title.toLowerCase().includes(q)).sort((a, b) => b.totalClicks - a.totalClicks);
  }, [data, search]);
  const paging = usePagination(rows, 20);

  const totals = useMemo(() => {
    const clicks = data.reduce((s, r) => s + (r.totalClicks || 0), 0);
    const users = data.reduce((s, r) => s + (r.uniqueUsers || 0), 0);
    const avg = data.length ? data.reduce((s, r) => s + Number(r.conversionRate || 0), 0) / data.length : 0;
    return { clicks, users, avg };
  }, [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MousePointerClick}
        title="Task Clicks"
        description="How often members open each task, and how many go on to complete it."
        actions={
          <Button variant="outline" className="rounded-xl" onClick={() => queryClient.invalidateQueries({ queryKey: ["taskClickAnalytics"] })}>
            <RefreshCcw className={isFetching ? "mr-1.5 h-4 w-4 animate-spin" : "mr-1.5 h-4 w-4"} />
            Refresh
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total clicks" value={totals.clicks.toLocaleString()} icon={MousePointerClick} tone="purple" loading={isLoading} />
        <StatCard label="Unique clickers" value={totals.users.toLocaleString()} icon={Users} tone="sky" hint="Summed per task" loading={isLoading} />
        <StatCard label="Avg. conversion" value={`${totals.avg.toFixed(1)}%`} icon={CheckCircle2} tone="emerald" hint="Clicks that became completions" loading={isLoading} />
      </div>
      <Panel
        title="Per task"
        actions={<SearchInput value={search} onChange={setSearch} placeholder="Search tasks" />}
      >
        {isLoading ? (
          <LoadingRows rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState icon={BarChart3} title="No click data yet" description="Numbers appear once members start opening tasks." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 font-medium">Task</th>
                    <th className="pb-3 font-medium">Platform</th>
                    <th className="pb-3 text-right font-medium">Clicks</th>
                    <th className="pb-3 text-right font-medium">Unique</th>
                    <th className="pb-3 pl-6 font-medium">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paging.pageItems.map((r) => {
                    const rate = Math.min(100, Number(r.conversionRate) || 0);
                    return (
                      <tr key={r.taskId}>
                        <td className="max-w-[280px] truncate py-3 pr-4 font-medium">{r.title}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{platformLabel(r.platform)}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{r.totalClicks.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{r.uniqueUsers.toLocaleString()}</td>
                        <td className="py-3 pl-6">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-600" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="tabular-nums text-muted-foreground">{rate.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager {...paging} />
          </>
        )}
      </Panel>
    </div>
  );
}

/* ───────────────────────── System ───────────────────────── */

interface Metrics {
  memory: { rss: number; heapTotal: number; heapUsed: number };
  application: { users: number; tasks: number; completedTasks: number; taskCompletionRate: string | number };
  server: { uptime: number; timestamp: string };
}
interface DbStatus {
  connected: boolean;
  status: string;
  lastChecked: string;
  error?: string;
}

export function useSystemStatus() {
  const metrics = useQuery<Metrics>({ queryKey: ["systemMetrics"], queryFn: () => adminFetch("/api/admin/system/metrics"), refetchInterval: 60_000, retry: false });
  const db = useQuery<DbStatus>({ queryKey: ["dbStatus"], queryFn: () => adminFetch("/api/admin/system/db-status"), refetchInterval: 60_000, retry: false });
  return { metrics, db };
}

export function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d ? `${d}d ${h}h` : `${h}h ${m}m`;
}

export function SystemAnalyticsSection() {
  const { metrics, db } = useSystemStatus();
  const m = metrics.data;
  const loading = metrics.isLoading;
  const heapPct = m ? Math.round((m.memory.heapUsed / Math.max(1, m.memory.heapTotal)) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Activity}
        title="System Analytics"
        description="Platform totals and the health of the running server."
        actions={
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["systemMetrics"] });
              queryClient.invalidateQueries({ queryKey: ["dbStatus"] });
            }}
          >
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />
      {metrics.error && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {(metrics.error as Error).message}. System metrics are visible to superadmins only.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered users" value={m?.application.users.toLocaleString() ?? "—"} icon={Users} tone="purple" loading={loading} />
        <StatCard label="Tasks" value={m?.application.tasks.toLocaleString() ?? "—"} icon={BarChart3} tone="sky" loading={loading} />
        <StatCard label="Completions" value={m?.application.completedTasks.toLocaleString() ?? "—"} icon={CheckCircle2} tone="emerald" hint={m ? `${m.application.taskCompletionRate} per task` : undefined} loading={loading} />
        <StatCard label="Server uptime" value={m ? formatUptime(m.server.uptime) : "—"} icon={Clock} tone="amber" hint="Since this instance started" loading={loading} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Database" description="Live connection check">
          <div className="flex items-center gap-4">
            <div className={db.data?.connected ? "flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600" : "flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600"}>
              {db.data?.connected ? <Database className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
            </div>
            <div className="min-w-0">
              {db.data ? <StatusPill status={db.data.connected ? "active" : "failed"} label={db.data.connected ? "Connected" : "Disconnected"} /> : <span className="text-sm text-muted-foreground">Checking…</span>}
              {db.data?.error && <p className="mt-1 break-all text-sm text-rose-600">{db.data.error}</p>}
              {db.data && <p className="mt-1 text-xs text-muted-foreground">Last checked {new Date(db.data.lastChecked).toLocaleTimeString()}</p>}
            </div>
          </div>
        </Panel>
        <Panel title="Memory" description="This server instance">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600">
              <Cpu className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex justify-between text-sm">
                <span>
                  {m?.memory.heapUsed ?? 0} MB of {m?.memory.heapTotal ?? 0} MB heap
                </span>
                <span className="tabular-nums text-muted-foreground">{heapPct}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-600" style={{ width: `${heapPct}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Resident memory {m?.memory.rss ?? 0} MB</p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
