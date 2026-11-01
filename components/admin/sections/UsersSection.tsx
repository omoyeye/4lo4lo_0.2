"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Award, ExternalLink, Key, Loader2, MoreHorizontal, Plus, RefreshCcw, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import {
  adminFetch,
  EmptyState,
  FilterChips,
  LoadingRows,
  PageHeader,
  Pager,
  Panel,
  RoleBadge,
  SearchInput,
  useConfirm,
  usePagination,
  UserAvatar,
} from "@/components/admin/kit";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  avatar: string | null;
  role: string | null;
  points: number;
  level: number;
  country: string | null;
  createdAt: string;
}

type RoleFilter = "all" | "member" | "admin" | "superadmin";

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Superadmin" },
];

const refresh = () => queryClient.invalidateQueries({ queryKey: ["adminUsers"] });

export function UsersSection() {
  const { toast } = useToast();
  const { user: me } = useAuth();
  const isSuperadmin = me?.role === "superadmin";
  const { confirm, dialog: confirmDialog } = useConfirm();

  // ?q= prefills the search (Fraud Flags links here with a username).
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [pointsFor, setPointsFor] = useState<AdminUser | null>(null);
  const [passwordFor, setPasswordFor] = useState<AdminUser | null>(null);

  const { data: users = [], isLoading, isFetching } = useQuery<AdminUser[]>({
    queryKey: ["adminUsers"],
    queryFn: () => adminFetch("/api/admin/users"),
    refetchInterval: 60_000,
  });

  const counts = useMemo(() => {
    const c = { all: users.length, member: 0, admin: 0, superadmin: 0 } as Record<RoleFilter, number>;
    users.forEach((u) => {
      const r = (u.role || "member") as RoleFilter;
      if (r in c) c[r]++;
      else c.member++;
    });
    return c;
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => roleFilter === "all" || (u.role || "member") === roleFilter)
      .filter((u) => !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || String(u.id) === q)
      .sort((a, b) => b.id - a.id);
  }, [users, search, roleFilter]);

  const paging = usePagination(filtered, 20);

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => adminFetch(`/api/admin/users/${id}/role`, { method: "PATCH", json: { role } }),
    onSuccess: () => {
      refresh();
      toast({ title: "Role updated" });
    },
    onError: (e: Error) => toast({ title: "Could not change role", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      refresh();
      toast({ title: "Account deleted", description: "Personal data was removed. Their task, referral and payout history is kept for the records." });
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Users"
        description={`${users.length.toLocaleString()} accounts on the platform`}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
            <Plus className="mr-1.5 h-4 w-4" />
            Create user
          </Button>
        }
      />

      <Panel bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <FilterChips<RoleFilter>
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "member", label: "Members", count: counts.member },
              { value: "admin", label: "Admins", count: counts.admin },
              { value: "superadmin", label: "Superadmins", count: counts.superadmin },
            ]}
          />
          <div className="flex items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or ID" />
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl" onClick={refresh} aria-label="Refresh">
              <RefreshCcw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </div>
        </div>

        <div className="p-4">
          {isLoading ? (
            <LoadingRows rows={6} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="No users match" description="Try a different search or filter." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 font-medium">Member</th>
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 text-right font-medium">Points</th>
                      <th className="pb-3 text-right font-medium">Level</th>
                      <th className="pb-3 font-medium">Joined</th>
                      <th className="pb-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paging.pageItems.map((u) => (
                      <tr key={u.id} className="group">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={u.username} src={u.avatar} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {u.username} <span className="font-normal text-muted-foreground">#{u.id}</span>
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {isSuperadmin && u.id !== me?.id && u.role !== "deleted" ? (
                            <Select value={u.role || "member"} onValueChange={(role) => roleMutation.mutate({ id: u.id, role })}>
                              <SelectTrigger className="h-8 w-[130px] rounded-lg text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <RoleBadge role={u.role} />
                          )}
                        </td>
                        <td className="py-3 pr-4 text-right font-semibold tabular-nums">{(u.points ?? 0).toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">{u.level ?? 1}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                        <td className="py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label={`Actions for ${u.username}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {isSuperadmin && (
                                <DropdownMenuItem onClick={() => setPointsFor(u)}>
                                  <Award className="mr-2 h-4 w-4" />
                                  Adjust points
                                </DropdownMenuItem>
                              )}
                              {(isSuperadmin || (u.role !== "admin" && u.role !== "superadmin")) && u.role !== "deleted" && (
                                <DropdownMenuItem onClick={() => setPasswordFor(u)}>
                                  <Key className="mr-2 h-4 w-4" />
                                  Reset password
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <a href={`/profile/${encodeURIComponent(u.username)}`} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View profile
                                </a>
                              </DropdownMenuItem>
                              {isSuperadmin && u.id !== me?.id && u.role !== "deleted" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() =>
                                      confirm({
                                        title: `Delete ${u.username}?`,
                                        description:
                                          "Their personal details are erased and they can no longer sign in. Task, referral and payout history stays for the records. This cannot be undone.",
                                        confirmLabel: "Delete account",
                                        destructive: true,
                                        onConfirm: () => deleteMutation.mutateAsync(u.id),
                                      })
                                    }
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete account
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager {...paging} />
            </>
          )}
        </div>
      </Panel>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} canCreateAdmins={isSuperadmin} />
      <AdjustPointsDialog user={pointsFor} onClose={() => setPointsFor(null)} />
      <ResetPasswordDialog user={passwordFor} onClose={() => setPasswordFor(null)} />
      {confirmDialog}
    </div>
  );
}

function CreateUserDialog({ open, onOpenChange, canCreateAdmins }: { open: boolean; onOpenChange: (o: boolean) => void; canCreateAdmins: boolean }) {
  const { toast } = useToast();
  const empty = { username: "", email: "", password: "", role: "member" };
  const [form, setForm] = useState(empty);
  const create = useMutation({
    mutationFn: () => adminFetch("/api/admin/users", { method: "POST", json: form }),
    onSuccess: () => {
      refresh();
      setForm(empty);
      onOpenChange(false);
      toast({ title: "User created", description: `${form.username} can now sign in.` });
    },
    onError: (e: Error) => toast({ title: "Could not create user", description: e.message, variant: "destructive" }),
  });
  const valid = form.username.trim().length >= 3 && /\S+@\S+\.\S+/.test(form.email) && form.password.length >= 8;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>The account can sign in straight away with this password.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="john_doe" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                {canCreateAdmins && <SelectItem value="admin">Admin</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || create.isPending} onClick={() => create.mutate()}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustPointsDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const pts = parseInt(amount, 10);
  const valid = !isNaN(pts) && pts !== 0;
  const award = useMutation({
    mutationFn: () => adminFetch(`/api/admin/users/${user!.id}/points`, { method: "PATCH", json: { points: pts } }),
    onSuccess: () => {
      refresh();
      toast({ title: pts > 0 ? "Points added" : "Points deducted", description: `${Math.abs(pts).toLocaleString()} points ${pts > 0 ? "added to" : "taken from"} ${user?.username}.` });
      setAmount("");
      onClose();
    },
    onError: (e: Error) => toast({ title: "Could not adjust points", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust points</DialogTitle>
          <DialogDescription>
            {user?.username} currently has <strong>{(user?.points ?? 0).toLocaleString()}</strong> points. Use a negative number to deduct.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Amount</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500 or -200" />
          {valid && user && <p className="text-sm text-muted-foreground">New balance: {Math.max(0, user.points + pts).toLocaleString()} points</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid || award.isPending} onClick={() => award.mutate()}>
            {award.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pts < 0 ? "Deduct points" : "Add points"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const reset = useMutation({
    mutationFn: () => adminFetch(`/api/admin/users/${user!.id}/password`, { method: "PATCH", json: { password } }),
    onSuccess: () => {
      toast({ title: "Password reset", description: `Share the new password with ${user?.username} securely.` });
      setPassword("");
      onClose();
    },
    onError: (e: Error) => toast({ title: "Reset failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>Set a new password for {user?.username}. They can change it later from the sign-in page.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>New password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={password.length < 8 || reset.isPending} onClick={() => reset.mutate()}>
            {reset.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
