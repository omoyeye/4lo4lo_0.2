"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ExternalLink, ImageUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { adminFetch, EmptyState, FilterChips, LoadingRows, PageHeader, Panel, platformLabel, StatusPill, UserAvatar } from "@/components/admin/kit";

interface Proof {
  id: number;
  user_id: number;
  task_id: number;
  image_url: string;
  note: string | null;
  points: number;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  username: string;
  display_name: string | null;
  avatar: string | null;
  task_title: string;
  platform: string;
  task_url: string;
}

type Status = "pending" | "approved" | "rejected" | "all";

const REJECT_REASONS = ["Screenshot doesn't show the completed action", "Wrong account or post", "Image is unreadable", "Looks edited or reused"];

export function ProofsSection() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>("pending");
  const [viewing, setViewing] = useState<Proof | null>(null);
  const [rejecting, setRejecting] = useState<Proof | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery<{ enabled: boolean; proofs: Proof[] }>({
    queryKey: ["adminProofs", status],
    queryFn: () => adminFetch(`/api/admin/proofs?status=${status}`),
    refetchInterval: 60_000,
  });
  const { data: settings } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });
  const required = settings?.task_proof_required === "true";
  const { user } = useAuth();
  const isSuperadmin = user?.role === "superadmin";
  const proofs = data?.proofs ?? [];

  const review = useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: "approve" | "reject"; reason?: string }) =>
      adminFetch(`/api/admin/proofs/${id}`, { method: "PATCH", json: { action, reason } }),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["adminProofs"] });
      toast({ title: v.action === "approve" ? "Approved, points paid" : "Rejected, member notified" });
      setViewing(null);
      setRejecting(null);
      setReason("");
    },
    onError: (e: Error) => toast({ title: "Could not update proof", description: e.message, variant: "destructive" }),
  });

  const toggleRequired = useMutation({
    mutationFn: (next: boolean) => adminFetch("/api/admin/settings/task_proof_required", { method: "PUT", json: { value: String(next), description: "Members upload a screenshot to finish a task" } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/settings"] }),
    onError: (e: Error) => toast({ title: "Could not change setting", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ImageUp}
        title="Task Proofs"
        description="Members upload a screenshot when they finish a task. Points stay pending until you approve it."
        actions={
          isSuperadmin && <Button variant={required ? "outline" : "default"} className="rounded-xl" disabled={toggleRequired.isPending || data?.enabled === false} onClick={() => toggleRequired.mutate(!required)}>
            {required ? "Turn proofs off" : "Require proof for tasks"}
          </Button>
        }
      />

      {data?.enabled === false && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Proofs need the new database tables. Run <code className="text-xs">scripts/sql/009-trust-and-proofs.sql</code> first.
        </p>
      )}
      {data?.enabled && !required && (
        <p className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
          Proofs are off: tasks pay out as soon as a member taps Complete. Turn them on to review screenshots first.
        </p>
      )}

      <Panel
        actions={
          <FilterChips<Status>
            value={status}
            onChange={setStatus}
            options={[
              { value: "pending", label: "To review", count: status === "pending" ? proofs.length : undefined },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "all", label: "All" },
            ]}
          />
        }
      >
        {isLoading ? (
          <LoadingRows rows={4} height="h-24" />
        ) : proofs.length === 0 ? (
          <EmptyState icon={ImageUp} title={status === "pending" ? "Nothing to review" : "No proofs here"} description={status === "pending" ? "New submissions show up here." : undefined} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {proofs.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-2xl border bg-card">
                <button type="button" className="block aspect-video w-full overflow-hidden bg-muted" onClick={() => setViewing(p)} aria-label="View screenshot">
                  <img src={p.image_url} alt={`Proof for ${p.task_title}`} className="h-full w-full object-cover transition-transform hover:scale-105" loading="lazy" />
                </button>
                <div className="space-y-3 p-4">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={p.display_name || p.username} src={p.avatar} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.display_name || p.username}</p>
                      <p className="truncate text-xs text-muted-foreground">@{p.username} · {new Date(p.created_at).toLocaleString()}</p>
                    </div>
                    <StatusPill status={p.status} />
                  </div>
                  <div>
                    <p className="line-clamp-1 text-sm font-medium">{p.task_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {platformLabel(p.platform)} · <span className="font-semibold text-foreground">{p.points} pts</span>
                    </p>
                    {p.note && <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">&ldquo;{p.note}&rdquo;</p>}
                    {p.reject_reason && <p className="mt-1 text-xs text-rose-600">Reason: {p.reject_reason}</p>}
                  </div>
                  {p.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700" disabled={review.isPending} onClick={() => review.mutate({ id: p.id, action: "approve" })}>
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 rounded-lg text-rose-600" disabled={review.isPending} onClick={() => setRejecting(p)}>
                        <X className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.task_title}</DialogTitle>
                <DialogDescription>
                  @{viewing.username} · {viewing.points} points ·{" "}
                  <a href={viewing.task_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    Open task link <ExternalLink className="h-3 w-3" />
                  </a>
                </DialogDescription>
              </DialogHeader>
              <img src={viewing.image_url} alt="Proof screenshot" className="max-h-[65vh] w-full rounded-xl bg-muted object-contain" />
              {viewing.status === "pending" && (
                <DialogFooter className="gap-2">
                  <Button variant="outline" className="text-rose-600" onClick={() => setRejecting(viewing)}>Reject</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={review.isPending} onClick={() => review.mutate({ id: viewing.id, action: "approve" })}>
                    Approve and pay {viewing.points} pts
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this proof?</DialogTitle>
            <DialogDescription>The member is told why, and can redo the task and submit again.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5">
            {REJECT_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full border px-3 py-1 text-xs hover:bg-muted">
                {r}
              </button>
            ))}
          </div>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown to the member)" maxLength={500} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={review.isPending} onClick={() => rejecting && review.mutate({ id: rejecting.id, action: "reject", reason })}>
              Reject proof
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
