"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarCheck, Construction, Database, ImageUp, MailCheck, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { adminFetch, PageHeader, Panel, StatusPill } from "@/components/admin/kit";
import { formatUptime, useSystemStatus } from "@/components/admin/sections/InsightsSections";
import {
  ClassroomToggle,
  LeaderboardSettingsPanel,
  MarketplaceSettingsPanel,
  PromoteMeToggle,
  RewardsSettingsPanel,
} from "@/components/admin/panels/FeatureSettingsPanels";

function MaintenancePanel() {
  const { toast } = useToast();
  const { data } = useQuery<{ value: string | null }>({
    queryKey: ["setting", "maintenance_mode"],
    queryFn: () => adminFetch("/api/admin/settings/maintenance_mode"),
  });
  const on = data?.value === "true";

  const save = useMutation({
    mutationFn: (next: boolean) => adminFetch("/api/admin/settings/maintenance_mode", { method: "PUT", json: { value: String(next), description: "Show members a maintenance screen" } }),
    onSuccess: (_d, next) => {
      queryClient.invalidateQueries({ queryKey: ["setting", "maintenance_mode"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: next ? "Maintenance mode on" : "Maintenance mode off",
        description: next ? "Members now see a maintenance screen. Admins can still use everything." : "The site is open to members again.",
      });
    },
    onError: (e: Error) => toast({ title: "Could not change maintenance mode", description: e.message, variant: "destructive" }),
  });

  return (
    <Panel>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={on ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600" : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"}>
            <Construction className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Maintenance mode</h3>
              <StatusPill status={on ? "pending" : "active"} label={on ? "On" : "Off"} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Shows members a &quot;back soon&quot; screen on the website and the app. Admins keep full access, and sign-in still works.
            </p>
          </div>
        </div>
        <Switch checked={on} disabled={!data || save.isPending} onCheckedChange={(v) => save.mutate(v)} aria-label="Maintenance mode" />
      </div>
    </Panel>
  );
}

function TrustPanel() {
  const { toast } = useToast();
  const { data: settings } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });
  const [checkinPoints, setCheckinPoints] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => adminFetch(`/api/admin/settings/${key}`, { method: "PUT", json: { value } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Saved" });
    },
    onError: (e: Error) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const rows = [
    {
      key: "task_proof_required",
      icon: ImageUp,
      title: "Require proof for tasks",
      desc: "Members upload a screenshot; points stay pending until an admin approves it in Task Proofs.",
      on: settings?.task_proof_required === "true",
    },
    {
      key: "email_verification_required",
      icon: MailCheck,
      title: "Confirmed email for payouts",
      desc: "Members must click the link in their confirmation email before they can request a withdrawal.",
      on: settings?.email_verification_required !== "false",
    },
  ];
  const currentPoints = checkinPoints ?? settings?.daily_checkin_points ?? "0";

  return (
    <Panel title="Trust & rewards" description="Fraud protection and the daily check-in reward.">
      <div className="divide-y">
        {rows.map((r) => (
          <div key={r.key} className="flex items-start justify-between gap-4 py-4 first:pt-0">
            <div className="flex items-start gap-3">
              <r.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
              </div>
            </div>
            <Switch checked={r.on} disabled={!settings || save.isPending} onCheckedChange={(v) => save.mutate({ key: r.key, value: String(v) })} aria-label={r.title} />
          </div>
        ))}
        <div className="flex flex-wrap items-start justify-between gap-4 py-4 last:pb-0">
          <div className="flex items-start gap-3">
            <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">Daily check-in reward</p>
              <p className="text-sm text-muted-foreground">Points for opening the site or app each day. Streak bonuses are set under Streaks. 0 turns it off.</p>
            </div>
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Math.max(0, Math.min(1000, parseInt(currentPoints, 10) || 0));
              save.mutate({ key: "daily_checkin_points", value: String(n) });
              setCheckinPoints(null);
            }}
          >
            <Input type="number" min={0} max={1000} className="w-24 rounded-xl" value={currentPoints} onChange={(e) => setCheckinPoints(e.target.value)} aria-label="Daily check-in points" />
            <Button type="submit" variant="outline" className="rounded-xl" disabled={save.isPending || checkinPoints === null}>Save</Button>
          </form>
        </div>
      </div>
    </Panel>
  );
}

export function SettingsSection() {
  const { metrics, db } = useSystemStatus();

  return (
    <div className="space-y-6">
      <PageHeader icon={Settings} title="Settings" description="Feature switches and platform configuration." />

      <Panel title="System status">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Database</p>
            <div className="mt-1">{db.data ? <StatusPill status={db.data.connected ? "active" : "failed"} label={db.data.connected ? "Connected" : "Disconnected"} /> : <span className="text-sm text-muted-foreground">Checking…</span>}</div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Server uptime</p>
            <p className="mt-1 text-sm font-medium">{metrics.data ? formatUptime(metrics.data.server.uptime) : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Memory</p>
            <p className="mt-1 text-sm font-medium">{metrics.data ? `${metrics.data.memory.heapUsed} / ${metrics.data.memory.heapTotal} MB` : "—"}</p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
          <Database className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Backups are not run from this panel. Use your host&apos;s scheduled database backups (DirectAdmin → MySQL Management), or a <code className="text-xs">mysqldump</code>.
          </p>
        </div>
      </Panel>

      <MaintenancePanel />
      <TrustPanel />

      <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <PromoteMeToggle />
        <ClassroomToggle />
      </div>
      <MarketplaceSettingsPanel />
      <LeaderboardSettingsPanel />
      <RewardsSettingsPanel />
    </div>
  );
}
