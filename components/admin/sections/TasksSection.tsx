"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Award, CalendarClock, ExternalLink, Loader2, MoreHorizontal, Pencil, Plus, Power, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  SearchInput,
  StatusPill,
  TASK_TYPE_OPTIONS,
  useConfirm,
  usePagination,
} from "@/components/admin/kit";

interface AdminTask {
  id: number;
  title: string;
  description: string;
  platform: string;
  type: string;
  points: number;
  taskUrl: string | null;
  isActive: boolean;
  maxCompletions: number | null;
  scheduledPublishAt: string | null;
  createdAt: string;
}

type StatusFilter = "all" | "active" | "inactive" | "scheduled";

const refresh = () => {
  queryClient.invalidateQueries({ queryKey: ["adminTasks"] });
  queryClient.invalidateQueries({ queryKey: ["adminStats"] });
};

function taskStatus(t: AdminTask): "active" | "scheduled" | "inactive" {
  if (t.isActive) return "active";
  if (t.scheduledPublishAt && new Date(t.scheduledPublishAt) > new Date()) return "scheduled";
  return "inactive";
}

export function TasksSection() {
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [platform, setPlatform] = useState("all");
  const [editing, setEditing] = useState<AdminTask | "new" | null>(null);

  const { data: tasks = [], isLoading, isFetching } = useQuery<AdminTask[]>({
    queryKey: ["adminTasks"],
    queryFn: () => adminFetch("/api/admin/tasks"),
    refetchInterval: 60_000,
  });
  const { data: stats } = useQuery<{ analytics?: { taskCompletionRate: { taskId: number; completions: number }[] } }>({
    queryKey: ["adminStats"],
    queryFn: () => adminFetch("/api/admin/stats"),
  });
  const completions = useMemo(() => new Map((stats?.analytics?.taskCompletionRate ?? []).map((t) => [t.taskId, t.completions])), [stats]);

  const counts = useMemo(() => {
    const c = { all: tasks.length, active: 0, inactive: 0, scheduled: 0 };
    tasks.forEach((t) => c[taskStatus(t)]++);
    return c;
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks
      .filter((t) => status === "all" || taskStatus(t) === status)
      .filter((t) => platform === "all" || t.platform === platform)
      .filter((t) => !q || t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q))
      .sort((a, b) => b.id - a.id);
  }, [tasks, search, status, platform]);
  const paging = usePagination(filtered, 15);

  const update = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<AdminTask> }) => adminFetch(`/api/admin/tasks/${id}`, { method: "PATCH", json: updates }),
    onSuccess: () => {
      refresh();
      toast({ title: "Task updated" });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/admin/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      refresh();
      toast({ title: "Task deleted" });
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Award}
        title="Tasks"
        description="Social tasks members complete to earn points."
        actions={
          <Button onClick={() => setEditing("new")} className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
            <Plus className="mr-1.5 h-4 w-4" />
            New task
          </Button>
        }
      />

      <Panel bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center xl:justify-between">
          <FilterChips<StatusFilter>
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Live", count: counts.active },
              { value: "scheduled", label: "Scheduled", count: counts.scheduled },
              { value: "inactive", label: "Paused", count: counts.inactive },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="h-10 w-full rounded-xl sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {PLATFORM_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SearchInput value={search} onChange={setSearch} placeholder="Search tasks" />
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl" onClick={refresh} aria-label="Refresh">
              <RefreshCcw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </div>
        </div>

        <div className="p-4">
          {isLoading ? (
            <LoadingRows rows={5} height="h-20" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Award}
              title={tasks.length ? "No tasks match" : "No tasks yet"}
              description={tasks.length ? "Try another filter or search." : "Create the first task members can complete."}
              action={!tasks.length && <Button onClick={() => setEditing("new")}>New task</Button>}
            />
          ) : (
            <>
              <ul className="divide-y">
                {paging.pageItems.map((t) => {
                  const s = taskStatus(t);
                  const done = completions.get(t.id) ?? 0;
                  return (
                    <li key={t.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/15 to-pink-500/15 text-sm font-bold text-purple-700 dark:text-purple-300">
                          {t.points}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold">{t.title}</p>
                            <StatusPill status={s} label={s === "active" ? "Live" : s === "inactive" ? "Paused" : "Scheduled"} />
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{t.description}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/80">{platformLabel(t.platform)}</span>
                            <span className="capitalize">{t.type}</span>
                            <span>
                              {done.toLocaleString()}
                              {t.maxCompletions ? ` / ${t.maxCompletions.toLocaleString()}` : ""} completions
                            </span>
                            {s === "scheduled" && t.scheduledPublishAt && (
                              <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400">
                                <CalendarClock className="h-3.5 w-3.5" />
                                {new Date(t.scheduledPublishAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Switch
                          checked={t.isActive}
                          onCheckedChange={(isActive) => update.mutate({ id: t.id, updates: { isActive, ...(isActive ? { scheduledPublishAt: null } : {}) } })}
                          aria-label={t.isActive ? "Pause task" : "Publish task"}
                        />
                        <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setEditing(t)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="More actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {t.taskUrl && (
                              <DropdownMenuItem asChild>
                                <a href={t.taskUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Open link
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => update.mutate({ id: t.id, updates: { isActive: !t.isActive, scheduledPublishAt: null } })}>
                              <Power className="mr-2 h-4 w-4" />
                              {t.isActive ? "Pause" : "Publish now"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                confirm({
                                  title: `Delete "${t.title}"?`,
                                  description: "Members will no longer see this task. Completions already earned are kept.",
                                  confirmLabel: "Delete task",
                                  destructive: true,
                                  onConfirm: () => remove.mutateAsync(t.id),
                                })
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {editing && <TaskDialog task={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {confirmDialog}
    </div>
  );
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

function TaskDialog({ task, onClose }: { task: AdminTask | null; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    platform: task?.platform ?? "facebook",
    type: task?.type ?? "like",
    points: String(task?.points ?? 50),
    taskUrl: task?.taskUrl ?? "",
    maxCompletions: task?.maxCompletions ? String(task.maxCompletions) : "",
    isActive: task?.isActive ?? true,
    schedule: toLocalInput(task?.scheduledPublishAt ?? null),
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const points = parseInt(form.points, 10);
  const valid = form.title.trim() && form.description.trim() && !isNaN(points) && points > 0;
  const scheduledIso = form.schedule ? new Date(form.schedule).toISOString() : null;
  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    platform: form.platform,
    type: form.type,
    points,
    taskUrl: form.taskUrl.trim(),
    maxCompletions: form.maxCompletions ? parseInt(form.maxCompletions, 10) : null,
    // A future schedule always means "not live yet"; the scheduler publishes it.
    isActive: scheduledIso && new Date(scheduledIso) > new Date() ? false : form.isActive,
    scheduledPublishAt: scheduledIso,
  };

  const save = useMutation({
    mutationFn: () =>
      task
        ? adminFetch(`/api/admin/tasks/${task.id}`, { method: "PATCH", json: payload })
        : adminFetch("/api/admin/tasks", { method: "POST", json: { ...payload, expiresAt: null } }),
    onSuccess: () => {
      refresh();
      toast({ title: task ? "Task saved" : "Task created" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Could not save task", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>{task ? "Changes go live as soon as you save." : "Members see this task as soon as it is live."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Like our Facebook page" />
          </div>
          <div className="space-y-1.5">
            <Label>Instructions</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Open the page and tap Like" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label>Action</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Link</Label>
            <Input value={form.taskUrl} onChange={(e) => set("taskUrl", e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Points</Label>
              <Input type="number" min={1} value={form.points} onChange={(e) => set("points", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Completion limit</Label>
              <Input type="number" min={1} value={form.maxCompletions} onChange={(e) => set("maxCompletions", e.target.value)} placeholder="Unlimited" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Publish at (optional)</Label>
            <Input type="datetime-local" value={form.schedule} onChange={(e) => set("schedule", e.target.value)} />
            <p className="text-xs text-muted-foreground">Leave empty to control it with the Live switch below.</p>
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Live</p>
              <p className="text-xs text-muted-foreground">Visible to members right now</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} disabled={!!form.schedule} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {task ? "Save changes" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
