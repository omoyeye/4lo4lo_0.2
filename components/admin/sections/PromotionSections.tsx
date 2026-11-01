"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, CheckCircle2, DollarSign, Eye, Loader2, Pencil, Plus, Rocket, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  adminFetch,
  EmptyState,
  FilterChips,
  LoadingRows,
  PageHeader,
  Pager,
  Panel,
  PLATFORM_OPTIONS,
  platformLabel,
  StatusPill,
  useConfirm,
  usePagination,
  UserAvatar,
} from "@/components/admin/kit";

/* ───────────────────────── Plans ───────────────────────── */

interface Plan {
  id: number;
  name: string;
  description: string | null;
  platform: string | null;
  engagementCount: number;
  price: string | number;
  features: string | null;
  duration: number | null;
  isActive: boolean;
  displayOrder?: number;
}

const refreshPlans = () => queryClient.invalidateQueries({ queryKey: ["promotionPlans"] });

export function PlansSection() {
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [editing, setEditing] = useState<Plan | "new" | null>(null);

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["promotionPlans"],
    queryFn: () => adminFetch("/api/promotion/plans"),
  });

  const toggle = useMutation({
    mutationFn: (p: Plan) => adminFetch(`/api/promotion/plans/${p.id}`, { method: "PATCH", json: { isActive: !p.isActive } }),
    onSuccess: refreshPlans,
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/promotion/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      refreshPlans();
      toast({ title: "Plan deleted" });
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Rocket}
        title="Promotion Plans"
        description="Packages members can buy on the Promote Me page."
        actions={
          <Button onClick={() => setEditing("new")} className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
            <Plus className="mr-1.5 h-4 w-4" />
            New plan
          </Button>
        }
      />

      {isLoading ? (
        <LoadingRows rows={3} height="h-40" />
      ) : plans.length === 0 ? (
        <EmptyState icon={Rocket} title="No plans yet" description="Create a plan so members can buy promotions." action={<Button onClick={() => setEditing("new")}>New plan</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{platformLabel(p.platform)}</p>
                  <h3 className="truncate text-lg font-bold">{p.name}</h3>
                </div>
                <Switch checked={p.isActive} onCheckedChange={() => toggle.mutate(p)} aria-label={p.isActive ? "Hide plan" : "Show plan"} />
              </div>
              <p className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-3xl font-extrabold text-transparent">${Number(p.price).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">
                {p.engagementCount.toLocaleString()} engagements{p.duration ? ` · ${p.duration} days` : ""}
              </p>
              {p.description && <p className="mt-3 line-clamp-2 text-sm">{p.description}</p>}
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <StatusPill status={p.isActive ? "active" : "inactive"} label={p.isActive ? "Visible" : "Hidden"} />
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setEditing(p)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete plan"
                    onClick={() =>
                      confirm({
                        title: `Delete "${p.name}"?`,
                        description: "Members can no longer buy this plan. Past requests are kept.",
                        confirmLabel: "Delete plan",
                        destructive: true,
                        onConfirm: () => remove.mutateAsync(p.id),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <PlanDialog plan={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {confirmDialog}
    </div>
  );
}

function PlanDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    platform: plan?.platform ?? "facebook",
    engagementCount: String(plan?.engagementCount ?? 1000),
    price: String(plan?.price ?? "10"),
    duration: String(plan?.duration ?? 30),
    features: plan?.features ?? "",
    isActive: plan?.isActive ?? true,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const payload = {
    name: form.name.trim(),
    description: form.description.trim(),
    platform: form.platform,
    engagementCount: parseInt(form.engagementCount, 10) || 0,
    price: parseFloat(form.price) || 0,
    duration: parseInt(form.duration, 10) || 30,
    features: form.features,
    isActive: form.isActive,
  };
  const valid = payload.name && payload.description && payload.engagementCount > 0 && payload.price > 0;

  const save = useMutation({
    mutationFn: () => (plan ? adminFetch(`/api/promotion/plans/${plan.id}`, { method: "PATCH", json: payload }) : adminFetch("/api/promotion/plans", { method: "POST", json: payload })),
    onSuccess: () => {
      refreshPlans();
      toast({ title: plan ? "Plan saved" : "Plan created" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Could not save plan", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit plan" : "New plan"}</DialogTitle>
          <DialogDescription>Shown to members on the Promote Me page.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Starter Boost" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Real engagement from active members" />
          </div>
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Select value={form.platform} onValueChange={(v) => set("platform", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Engagements</Label>
              <Input type="number" min={1} value={form.engagementCount} onChange={(e) => set("engagementCount", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Price ($)</Label>
              <Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Days</Label>
              <Input type="number" min={1} value={form.duration} onChange={(e) => set("duration", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Features</Label>
            <Input value={form.features} onChange={(e) => set("features", e.target.value)} placeholder="Comma separated" />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Visible to members</p>
              <p className="text-xs text-muted-foreground">Hidden plans can&apos;t be bought</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {plan ? "Save changes" : "Create plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Requests ───────────────────────── */

interface PromoRequest {
  id: number;
  userId: number;
  planId: number;
  platform: string;
  status: string;
  paymentStatus?: string;
  price?: string | number;
  requestedAt: string;
}

type ReqFilter = "all" | "pending" | "in_progress" | "completed" | "cancelled";

const refreshRequests = () => queryClient.invalidateQueries({ queryKey: ["promotionRequests"] });

export function RequestsSection() {
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [filter, setFilter] = useState<ReqFilter>("pending");
  const [detailsId, setDetailsId] = useState<number | null>(null);

  const { data: requests = [], isLoading } = useQuery<PromoRequest[]>({
    queryKey: ["promotionRequests"],
    queryFn: () => adminFetch("/api/promotion/requests"),
    refetchInterval: 30_000,
  });
  const { data: users = [] } = useQuery<{ id: number; username: string; avatar: string | null }[]>({
    queryKey: ["adminUsers"],
    queryFn: () => adminFetch("/api/admin/users"),
  });
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const counts = useMemo(() => {
    const c: Record<ReqFilter, number> = { all: requests.length, pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
    requests.forEach((r) => {
      if (r.status in c) c[r.status as ReqFilter]++;
    });
    return c;
  }, [requests]);

  const filtered = useMemo(
    () => requests.filter((r) => filter === "all" || r.status === filter).sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
    [requests, filter]
  );
  const paging = usePagination(filtered, 15);

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminFetch(`/api/promotion/requests/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: () => {
      refreshRequests();
      toast({ title: "Request updated" });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/promotion/requests/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      refreshRequests();
      toast({ title: "Request deleted" });
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <PageHeader icon={DollarSign} title="Promotion Requests" description="Approve, deliver and close out paid promotions." />

      <Panel bodyClassName="p-0">
        <div className="border-b p-4">
          <FilterChips<ReqFilter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "pending", label: "Pending", count: counts.pending },
              { value: "in_progress", label: "In progress", count: counts.in_progress },
              { value: "completed", label: "Completed", count: counts.completed },
              { value: "cancelled", label: "Cancelled", count: counts.cancelled },
              { value: "all", label: "All", count: counts.all },
            ]}
          />
        </div>
        <div className="p-4">
          {isLoading ? (
            <LoadingRows rows={5} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={DollarSign} title="Nothing here" description={filter === "pending" ? "No requests are waiting for approval." : "No requests with this status."} />
          ) : (
            <>
              <ul className="divide-y">
                {paging.pageItems.map((r) => {
                  const u = userById.get(r.userId);
                  return (
                    <li key={r.id} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <UserAvatar name={u?.username ?? `#${r.userId}`} src={u?.avatar} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {u?.username ?? `User #${r.userId}`} <span className="font-normal text-muted-foreground">· request #{r.id}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {platformLabel(r.platform)} · {new Date(r.requestedAt).toLocaleString()}
                            {r.price ? ` · $${Number(r.price).toFixed(2)}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                        <StatusPill status={r.status} />
                        {r.status === "pending" && (
                          <>
                            <Button size="sm" className="rounded-lg" onClick={() => setStatus.mutate({ id: r.id, status: "in_progress" })} disabled={setStatus.isPending}>
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg"
                              disabled={setStatus.isPending}
                              onClick={() =>
                                confirm({
                                  title: "Reject this request?",
                                  description: "The member is notified that the request was cancelled.",
                                  confirmLabel: "Reject",
                                  destructive: true,
                                  onConfirm: () => setStatus.mutateAsync({ id: r.id, status: "cancelled" }),
                                })
                              }
                            >
                              <X className="mr-1 h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </>
                        )}
                        {r.status === "in_progress" && (
                          <Button size="sm" className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setStatus.mutate({ id: r.id, status: "completed" })} disabled={setStatus.isPending}>
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Mark delivered
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => setDetailsId(r.id)} aria-label="View details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete request"
                          onClick={() =>
                            confirm({
                              title: "Delete this request?",
                              description: "It is removed from the list permanently.",
                              confirmLabel: "Delete",
                              destructive: true,
                              onConfirm: () => remove.mutateAsync(r.id),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Pager {...paging} />
            </>
          )}
        </div>
      </Panel>

      <RequestDetailsDialog id={detailsId} onClose={() => setDetailsId(null)} />
      {confirmDialog}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{children}</div>
    </div>
  );
}

function RequestDetailsDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data: d, isLoading } = useQuery<any>({
    queryKey: ["requestDetails", id],
    queryFn: () => adminFetch(`/api/admin/promotion-request/${id}`),
    enabled: !!id,
  });

  const when = (v?: string | null) => (v ? new Date(v).toLocaleString() : "—");

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Promotion request #{id}</DialogTitle>
          <DialogDescription>Everything submitted with this request.</DialogDescription>
        </DialogHeader>
        {isLoading || !d ? (
          <LoadingRows rows={4} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-4">
              <UserAvatar name={d.user?.username ?? "?"} size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{d.user?.username ?? `User #${d.userId}`}</p>
                <p className="truncate text-sm text-muted-foreground">{d.user?.email}</p>
              </div>
              <StatusPill status={d.status} />
            </div>
            <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
              <Field label="Platform">{platformLabel(d.platform)}</Field>
              <Field label="Engagement type">
                <span className="capitalize">{d.engagementType}</span>
              </Field>
              <Field label="Plan">#{d.planId}</Field>
              <Field label="Engagements">{d.customEngagementCount ?? "Plan default"}</Field>
              <Field label="Price">${d.price}</Field>
              <Field label="Payment">
                <StatusPill status={d.paymentStatus ?? "unpaid"} />
              </Field>
              <Field label="Requested">{when(d.requestedAt)}</Field>
              <Field label="Completed">{when(d.completedAt)}</Field>
              <div className="sm:col-span-2">
                <Field label="Link to promote">
                  <a href={d.socialMediaUrl} target="_blank" rel="noopener noreferrer" className="break-all text-purple-600 hover:underline dark:text-purple-400">
                    {d.socialMediaUrl}
                  </a>
                </Field>
              </div>
              {d.stripeSessionId && (
                <div className="sm:col-span-2">
                  <Field label="Stripe session">
                    <span className="break-all font-mono text-xs">{d.stripeSessionId}</span>
                  </Field>
                </div>
              )}
            </div>
            {d.additionalDetails && (
              <div className="rounded-xl border p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Member notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{d.additionalDetails}</p>
              </div>
            )}
            {d.adminNotes && (
              <div className="rounded-xl border p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{d.adminNotes}</p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
