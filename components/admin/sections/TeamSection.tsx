"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ShieldCheck, UserCog, UserMinus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { adminFetch, EmptyState, LoadingRows, PageHeader, Panel, RoleBadge, SearchInput, UserAvatar, useConfirm } from "@/components/admin/kit";

interface Member {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  avatar: string | null;
  role: string | null;
  createdAt: string;
}

type AdminRole = "admin" | "superadmin";

/** What each role can do. Matches requireAdmin / requireSuperadmin on the API. */
const ABILITIES: { label: string; admin: boolean }[] = [
  { label: "Tasks, task proofs, classroom, badges, streaks", admin: true },
  { label: "Promotion requests (fulfil orders)", admin: true },
  { label: "Marketplace, ads, fraud flags, analytics", admin: true },
  { label: "View members, reset a member's password", admin: true },
  { label: "Payouts (view and approve)", admin: false },
  { label: "Adjust points, delete accounts", admin: false },
  { label: "Email / notify all members", admin: false },
  { label: "Settings, maintenance, reward rates, referral tiers, promotion plans", admin: false },
  { label: "Add or remove admins, activity log", admin: false },
];

/**
 * Admin team management, built on users.role, the same field sign-in checks.
 * (The old screen edited the legacy `admins` table, which sign-in no longer
 * reads, so accounts created there could never log in.)
 */
export function TeamSection() {
  const { toast } = useToast();
  const { user: me } = useAuth();
  const { confirm, dialog } = useConfirm();
  const [addOpen, setAddOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery<Member[]>({
    queryKey: ["adminUsers"],
    queryFn: () => adminFetch("/api/admin/users"),
  });
  const team = useMemo(
    () => users.filter((u) => u.role === "admin" || u.role === "superadmin").sort((a, b) => (a.role === b.role ? a.username.localeCompare(b.username) : a.role === "superadmin" ? -1 : 1)),
    [users]
  );

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => adminFetch(`/api/admin/users/${id}/role`, { method: "PATCH", json: { role } }),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast({
        title: v.role === "member" ? "Admin access removed" : `Now ${v.role === "superadmin" ? "a superadmin" : "an admin"}`,
        description: "Takes effect the next time they sign in.",
      });
    },
    onError: (e: Error) => toast({ title: "Couldn't change role", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserCog}
        title="Admin Team"
        description="Who can use this panel, and how much they can do. Every admin signs in with a code sent to their email."
        actions={
          <Button className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white" onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Add admin
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title={`Team (${team.length})`} description="Keep superadmins to one or two people.">
          {isLoading ? (
            <LoadingRows rows={3} />
          ) : team.length === 0 ? (
            <EmptyState icon={UserCog} title="No admins yet" />
          ) : (
            <div className="divide-y">
              {team.map((u) => {
                const self = u.id === me?.id;
                return (
                  <div key={u.id} className="flex flex-wrap items-center gap-3 py-3">
                    <UserAvatar name={u.displayName || u.username} src={u.avatar} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {u.displayName || u.username} {self && <span className="text-xs text-muted-foreground">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{u.username} · {u.email}
                      </p>
                    </div>
                    {self ? (
                      <RoleBadge role={u.role} />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Select value={u.role ?? "admin"} onValueChange={(role) => setRole.mutate({ id: u.id, role })} disabled={setRole.isPending}>
                          <SelectTrigger className="h-9 w-36 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="superadmin">Superadmin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Remove admin access for ${u.username}`}
                          onClick={() =>
                            confirm({
                              title: `Remove admin access for ${u.username}?`,
                              description: "Their account stays as a regular member. They lose the admin panel the next time they sign in.",
                              confirmLabel: "Remove access",
                              destructive: true,
                              onConfirm: () => setRole.mutateAsync({ id: u.id, role: "member" }),
                            })
                          }
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="What each role can do">
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-2.5 text-left font-medium">Ability</th>
                  <th className="p-2.5 text-center font-medium">Admin</th>
                  <th className="p-2.5 text-center font-medium">Super</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ABILITIES.map((a) => (
                  <tr key={a.label}>
                    <td className="p-2.5">{a.label}</td>
                    <td className="p-2.5 text-center">{a.admin ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : <X className="mx-auto h-4 w-4 text-muted-foreground/60" />}</td>
                    <td className="p-2.5 text-center">
                      <Check className="mx-auto h-4 w-4 text-emerald-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Role changes apply at the person&apos;s next sign-in. You can&apos;t change your own role, so there is always at least one superadmin.
          </p>
        </Panel>
      </div>

      <AddAdminDialog open={addOpen} onOpenChange={setAddOpen} members={users} onAdd={(id, role) => setRole.mutateAsync({ id, role }).then(() => setAddOpen(false))} />
      {dialog}
    </div>
  );
}

function AddAdminDialog({
  open,
  onOpenChange,
  members,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  members: Member[];
  onAdd: (id: number, role: AdminRole) => Promise<unknown>;
}) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Member | null>(null);
  const [role, setRoleValue] = useState<AdminRole>("admin");
  const [busy, setBusy] = useState(false);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return members
      .filter((m) => (m.role ?? "member") === "member" && (m.username.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.displayName ?? "").toLowerCase().includes(q)))
      .slice(0, 8);
  }, [members, search]);

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setSearch("");
      setPicked(null);
      setRoleValue("admin");
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an admin</DialogTitle>
          <DialogDescription>Pick an existing member. They need a real email address: admin sign-in sends a code to it.</DialogDescription>
        </DialogHeader>

        {picked ? (
          <div className="flex items-center gap-3 rounded-xl border p-3">
            <UserAvatar name={picked.displayName || picked.username} src={picked.avatar} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">@{picked.username}</p>
              <p className="truncate text-xs text-muted-foreground">{picked.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>
              Change
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search members by name, username or email" />
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {matches.map((m) => (
                <button key={m.id} type="button" onClick={() => setPicked(m)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted">
                  <UserAvatar name={m.displayName || m.username} src={m.avatar} size={30} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">@{m.username}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </button>
              ))}
              {search.trim().length >= 2 && matches.length === 0 && <p className="p-2 text-sm text-muted-foreground">No members match.</p>}
            </div>
          </div>
        )}

        <Select value={role} onValueChange={(v) => setRoleValue(v as AdminRole)}>
          <SelectTrigger className="rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin: day-to-day operations</SelectItem>
            <SelectItem value="superadmin">Superadmin: full control, including money</SelectItem>
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            disabled={!picked || busy}
            onClick={async () => {
              if (!picked) return;
              setBusy(true);
              await onAdd(picked.id, role).catch(() => {});
              setBusy(false);
              setPicked(null);
              setSearch("");
            }}
          >
            Make {role === "superadmin" ? "superadmin" : "admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
