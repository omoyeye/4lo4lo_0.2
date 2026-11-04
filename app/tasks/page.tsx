"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, Heart, History, ListChecks, MessageSquare, RefreshCcw, Search, Share2, SlidersHorizontal, Star, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task } from "@shared/schema.mysql";
import TaskCard from "@/components/tasks/TaskCard";
import ProofUploadDialog from "@/components/tasks/ProofUploadDialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useTaskNotifications } from "@/hooks/use-task-notifications";
import { ProtectedRoute } from "@/lib/protected-route";
import { EmptyState, MemberLayout, Pills, Section } from "@/components/member/kit";
import { PLATFORMS, PlatformBadge } from "@/components/member/platform";
import { cn } from "@/lib/utils";

const TYPES = [
  { type: "follow", label: "Follow", icon: UserPlus },
  { type: "like", label: "Like", icon: Heart },
  { type: "comment", label: "Comment", icon: MessageSquare },
  { type: "share", label: "Share", icon: Share2 },
  { type: "view", label: "Watch", icon: Eye },
  { type: "survey", label: "Survey", icon: Star },
] as const;
const KNOWN_TYPES = new Set<string>(TYPES.map((t) => t.type));

type View = "available" | "history";

interface CompletedTask {
  id: number;
  completedAt: string;
  pointsEarned?: number;
  verificationStatus?: string;
  task?: { title?: string; platform?: string; points?: number };
}

function TasksContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  useTaskNotifications();

  const [view, setView] = useState<View>("available");
  const [platform, setPlatform] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("most_points");
  const [search, setSearch] = useState("");
  const [proofTask, setProofTask] = useState<Task | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);

  const { data: tasks = [], isLoading, error, refetch, isFetching } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { userId: user?.id }],
    enabled: !!user,
  });
  const { data: completed = [], isLoading: loadingCompleted } = useQuery<CompletedTask[]>({
    queryKey: [`/api/tasks/completed/${user?.id}`],
    enabled: !!user,
  });

  const presentPlatforms = useMemo(() => new Set(tasks.map((t) => t.platform.toLowerCase())), [tasks]);
  const presentTypes = useMemo(() => new Set(tasks.map((t) => t.type.toLowerCase())), [tasks]);
  const hasOther = tasks.some((t) => !KNOWN_TYPES.has(t.type.toLowerCase()));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks
      .filter((t) => (platform ? t.platform.toLowerCase() === platform : true))
      .filter((t) => (type ? (type === "other" ? !KNOWN_TYPES.has(t.type.toLowerCase()) : t.type.toLowerCase() === type) : true))
      .filter((t) => (q ? t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) : true))
      .sort((a, b) => (sortBy === "most_points" ? b.points - a.points : sortBy === "least_points" ? a.points - b.points : b.id - a.id));
  }, [tasks, platform, type, search, sortBy]);

  const totalAvailablePoints = tasks.reduce((s, t) => s + t.points, 0);
  const today = new Date().toDateString();
  const doneToday = completed.filter((c) => new Date(c.completedAt).toDateString() === today).length;
  const inReview = completed.filter((c) => c.verificationStatus === "in_review").length;
  const hasFilters = !!(platform || type || search);

  const complete = useMutation({
    mutationFn: async ({ taskId, clickId }: { taskId: number; clickId?: number }) => {
      setCompletingId(taskId);
      const response = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ taskId, ...(clickId ? { clickId } : {}) }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 409 && data.proofRequired) return { proofRequired: true, taskId };
      if (!response.ok) throw new Error(data.message || "Failed to complete task");
      return data;
    },
    onSuccess: (data) => {
      if (data?.proofRequired) {
        const task = tasks.find((t) => t.id === data.taskId);
        if (task) setProofTask(task);
        return;
      }
      toast(
        data?.alreadyCompleted
          ? { title: "Already completed", description: "You've already earned points for this task." }
          : { title: "Task completed! 🎉", description: data?.pointsEarned ? `+${data.pointsEarned} points added to your balance.` : "Points added to your balance." }
      );
      refreshAll();
    },
    onError: (err) => {
      toast({ title: "Couldn't complete task", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
      // The task may have expired or filled up meanwhile; reload so it drops off.
      refreshAll();
    },
    onSettled: () => setCompletingId(null),
  });

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    queryClient.invalidateQueries({ queryKey: [`/api/tasks/completed/${user?.id}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  }

  const clearFilters = () => {
    setPlatform(null);
    setType(null);
    setSearch("");
  };

  return (
    <MemberLayout wide>
      {/* Compact header: the tasks are the page. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{tasks.length}</span> available ·{" "}
            <span className="font-semibold text-foreground">{totalAvailablePoints.toLocaleString()}</span> pts to earn
            {doneToday > 0 && <> · {doneToday} done today</>}
            {inReview > 0 && <> · <span className="text-amber-600">{inReview} in review</span></>}
          </p>
        </div>
        <Pills<View>
          value={view}
          onChange={setView}
          options={[
            { value: "available", label: "Available", count: tasks.length },
            { value: "history", label: "History", count: completed.length },
          ]}
        />
      </div>

      {view === "available" ? (
        <>
          {/* Phones: search, then one swipeable row of filters, so the tasks stay on screen. Desktop: a single row. */}
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center" data-tutorial="platform-filters">
            <div className="flex items-center gap-2 md:contents">
              <div className="relative min-w-0 flex-1 md:min-w-[180px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks" className="h-10 rounded-xl pl-9" />
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl md:order-last" onClick={() => refetch()} aria-label="Refresh tasks">
                <RefreshCcw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              </Button>
            </div>
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:contents [&::-webkit-scrollbar]:hidden">
              <Select value={platform ?? "all"} onValueChange={(v) => setPlatform(v === "all" ? null : v)}>
                <SelectTrigger className="h-10 w-[150px] shrink-0 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  {PLATFORMS.filter((p) => presentPlatforms.has(p.key)).map((p) => {
                    const Icon = p.icon;
                    return (
                      <SelectItem key={p.key} value={p.key}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" style={{ color: p.color }} /> {p.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {(TYPES.some((t) => presentTypes.has(t.type)) || hasOther) && (
                <Select value={type ?? "all"} onValueChange={(v) => setType(v === "all" ? null : v)}>
                  <SelectTrigger className="h-10 w-[130px] shrink-0 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {TYPES.filter((t) => presentTypes.has(t.type)).map((t) => (
                      <SelectItem key={t.type} value={t.type}>
                        {t.label}
                      </SelectItem>
                    ))}
                    {hasOther && <SelectItem value="other">Other</SelectItem>}
                  </SelectContent>
                </Select>
              )}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-[150px] shrink-0 rounded-xl">
                  <SlidersHorizontal className="mr-1 h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="most_points">Most points</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="least_points">Fewest points</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <button onClick={clearFilters} className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:underline dark:text-purple-400">
                  <X className="h-3.5 w-3.5" /> Clear ({filtered.length} shown)
                </button>
              )}
            </div>
          </div>

          <div data-tutorial="task-list">
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-52 animate-pulse rounded-2xl border bg-muted/40" />
                ))}
              </div>
            ) : error ? (
              <Section>
                <EmptyState icon={RefreshCcw} title="Couldn't load tasks" description="Check your connection and try again." action={<Button onClick={() => refetch()}>Try again</Button>} />
              </Section>
            ) : filtered.length === 0 ? (
              <Section>
                <EmptyState
                  icon={ListChecks}
                  title={hasFilters ? "No tasks match these filters" : "You're all caught up!"}
                  description={hasFilters ? "Try another platform or clear the filters." : "New tasks are added regularly. We'll notify you when they arrive."}
                  action={hasFilters ? <Button variant="outline" onClick={clearFilters}>Clear filters</Button> : undefined}
                />
              </Section>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((task) => (
                  <TaskCard key={task.id} {...task} completing={completingId === task.id} onComplete={(taskId, clickId) => complete.mutate({ taskId, clickId })} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <Section title="Completed tasks" description="Everything you've done, newest first." bodyClassName="p-2 sm:p-3">
          {loadingCompleted ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/50" />
              ))}
            </div>
          ) : completed.length === 0 ? (
            <EmptyState icon={History} title="No completed tasks yet" description="Finish your first task and it will appear here." action={<Button onClick={() => setView("available")}>Browse tasks</Button>} />
          ) : (
            <ul className="divide-y">
              {completed.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-3">
                  <PlatformBadge platform={c.task?.platform ?? ""} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.task?.title || "Task"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.completedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-semibold", c.verificationStatus === "in_review" ? "text-amber-600" : "text-emerald-600")}>
                      +{c.pointsEarned || c.task?.points || 0}
                    </p>
                    {c.verificationStatus === "in_review" && <p className="text-xs text-amber-600">In review</p>}
                    {c.verificationStatus === "verified" && <p className="text-xs text-emerald-600">Verified</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <ProofUploadDialog
        key={proofTask?.id ?? "none"}
        task={proofTask}
        onClose={() => setProofTask(null)}
        onSubmitted={(message) => {
          setProofTask(null);
          toast({ title: "Proof submitted", description: message });
          refreshAll();
        }}
      />
    </MemberLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <TasksContent />
    </ProtectedRoute>
  );
}
