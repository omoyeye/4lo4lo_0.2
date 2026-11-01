"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, History, ImageUp, KeyRound, Settings, ShieldCheck, Trash2, Wallet, type LucideIcon } from "lucide-react";
import { adminFetch, EmptyState, FilterChips, LoadingRows, PageHeader, Pager, Panel, SearchInput, usePagination } from "@/components/admin/kit";

interface Entry {
  id: number;
  admin_id: number;
  admin_username: string | null;
  action: string;
  summary: string;
  created_at: string;
}

const KINDS: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  "payout.update": { label: "Payout", icon: Wallet, tone: "bg-amber-500/10 text-amber-600" },
  "points.adjust": { label: "Points", icon: Award, tone: "bg-purple-500/10 text-purple-600" },
  "user.delete": { label: "Deletion", icon: Trash2, tone: "bg-rose-500/10 text-rose-600" },
  "user.role": { label: "Role", icon: ShieldCheck, tone: "bg-sky-500/10 text-sky-600" },
  "user.password_reset": { label: "Password", icon: KeyRound, tone: "bg-slate-500/10 text-slate-600" },
  "setting.update": { label: "Setting", icon: Settings, tone: "bg-emerald-500/10 text-emerald-600" },
  "proof.review": { label: "Proof", icon: ImageUp, tone: "bg-pink-500/10 text-pink-600" },
};

type Filter = "all" | "money" | "accounts" | "settings" | "proofs";
const FILTERS: Record<Filter, string[] | null> = {
  all: null,
  money: ["payout.update", "points.adjust"],
  accounts: ["user.delete", "user.role", "user.password_reset"],
  settings: ["setting.update"],
  proofs: ["proof.review"],
};

/** Who did what in the admin panel (scripts/sql/010). Superadmins only. */
export function ActivitySection() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery<{ enabled: boolean; entries: Entry[] }>({
    queryKey: ["adminAudit"],
    queryFn: () => adminFetch("/api/admin/audit"),
    refetchInterval: 60_000,
  });

  const rows = useMemo(() => {
    const allowed = FILTERS[filter];
    const q = search.trim().toLowerCase();
    return (data?.entries ?? []).filter(
      (e) => (!allowed || allowed.includes(e.action)) && (!q || e.summary.toLowerCase().includes(q) || (e.admin_username ?? "").toLowerCase().includes(q))
    );
  }, [data, filter, search]);
  const paging = usePagination(rows, 25);

  return (
    <div className="space-y-6">
      <PageHeader icon={History} title="Activity Log" description="Every payout decision, points change, deletion, role change, setting change and proof review, with who did it." />

      {data?.enabled === false && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          The log needs its database table. Run <code className="text-xs">scripts/sql/010-admin-audit-log.sql</code>; actions are recorded from then on.
        </p>
      )}

      <Panel
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FilterChips
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All" },
                { value: "money", label: "Money" },
                { value: "accounts", label: "Accounts" },
                { value: "settings", label: "Settings" },
                { value: "proofs", label: "Proofs" },
              ]}
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Search" />
          </div>
        }
      >
        {isLoading ? (
          <LoadingRows rows={6} />
        ) : rows.length === 0 ? (
          <EmptyState icon={History} title="Nothing logged yet" description="Admin actions appear here as they happen." />
        ) : (
          <>
            <ol className="divide-y">
              {paging.pageItems.map((e) => {
                const kind = KINDS[e.action] ?? { label: e.action, icon: History, tone: "bg-muted text-muted-foreground" };
                const Icon = kind.icon;
                return (
                  <li key={e.id} className="flex items-start gap-3 py-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${kind.tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{e.summary}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        by <span className="font-medium text-foreground">@{e.admin_username ?? `#${e.admin_id}`}</span> · {new Date(e.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline">{kind.label}</span>
                  </li>
                );
              })}
            </ol>
            <Pager {...paging} />
          </>
        )}
      </Panel>
    </div>
  );
}
