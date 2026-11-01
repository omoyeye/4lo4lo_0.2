"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { MonitorSmartphone, ShieldAlert, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminFetch, EmptyState, FilterChips, LoadingRows, PageHeader, Panel, RoleBadge, StatCard } from "@/components/admin/kit";

interface FlagUser {
  id: number;
  username: string;
  email: string;
  points: number;
  role: string | null;
  created_at: string;
  referred_by: number | null;
}
interface Group {
  key: string;
  kind: "device" | "network";
  lastSeen: string;
  users: FlagUser[];
  selfReferrals: number;
}

export function FlagsSection() {
  const router = useRouter();
  const [view, setView] = useState<"device" | "network">("device");
  const { data, isLoading } = useQuery<{ enabled: boolean; devices: Group[]; networks: Group[] }>({
    queryKey: ["adminFraud"],
    queryFn: () => adminFetch("/api/admin/fraud"),
    refetchInterval: 300_000,
  });

  const groups = (view === "device" ? data?.devices : data?.networks) ?? [];
  const selfRefs = (data?.devices ?? []).reduce((n, g) => n + g.selfReferrals, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldAlert}
        title="Fraud Flags"
        description="Accounts that signed in from the same device, or many accounts on one network. These are leads to check, not proof: families and offices share connections."
      />

      {data?.enabled === false && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Device checks need the new database tables. Run <code className="text-xs">scripts/sql/009-trust-and-proofs.sql</code>; devices are recorded from the next sign-in on.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Shared devices" value={data?.devices.length ?? "—"} icon={MonitorSmartphone} tone="rose" hint="2+ accounts on one device" loading={isLoading} onClick={() => setView("device")} />
        <StatCard label="Busy networks" value={data?.networks.length ?? "—"} icon={Wifi} tone="amber" hint="4+ accounts on one connection" loading={isLoading} onClick={() => setView("network")} />
        <StatCard label="Self-referrals" value={selfRefs} icon={ShieldAlert} tone="purple" hint="Referred by an account on the same device" loading={isLoading} />
      </div>

      <Panel
        actions={
          <FilterChips
            value={view}
            onChange={setView}
            options={[
              { value: "device", label: "Same device", count: data?.devices.length },
              { value: "network", label: "Same network", count: data?.networks.length },
            ]}
          />
        }
      >
        {isLoading ? (
          <LoadingRows rows={4} />
        ) : groups.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="Nothing flagged" description="No accounts match this check right now." />
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={`${g.kind}-${g.key}`} className="rounded-2xl border p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    {g.kind === "device" ? <MonitorSmartphone className="h-4 w-4 text-rose-500" /> : <Wifi className="h-4 w-4 text-amber-500" />}
                    <span className="font-semibold">{g.users.length} accounts</span>
                    <span className="font-mono text-xs text-muted-foreground">#{g.key}</span>
                    {g.selfReferrals > 0 && (
                      <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                        {g.selfReferrals} referred each other
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">Last seen {new Date(g.lastSeen).toLocaleString()}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <tbody className="divide-y">
                      {g.users.map((u) => (
                        <tr key={u.id}>
                          <td className="py-2 pr-4">
                            <p className="font-medium">@{u.username}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </td>
                          <td className="py-2 pr-4"><RoleBadge role={u.role} /></td>
                          <td className="py-2 pr-4 tabular-nums">{u.points.toLocaleString()} pts</td>
                          <td className="py-2 pr-4 text-xs text-muted-foreground">Joined {new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="py-2 text-right">
                            <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => router.push(`/admin?section=users&q=${encodeURIComponent(u.username)}`)}>
                              Manage
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
