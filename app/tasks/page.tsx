"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Coins, Eye, Heart, History, ListChecks, MessageSquare, RefreshCcw, Search, Share2, SlidersHorizontal, Star, UserPlus, X } from "lucide-react";
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
import { EmptyState, MemberLayout, PageHeader, Pills, Section, StatTile } from "@/components/member/kit";
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
    onError: (err) => toast({ title: "Couldn't complete task", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" }),
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
      <PageHeader
        icon={ListChecks}
        title="Tasks"
        description="Engage with real creators' posts and earn points for every task."
        actions={
          <Button variant="outline" className="rounded-xl" onClick={() => refetch()}>
            <RefreshCcw className={cn("mr-1.5 h-4 w-4", isFetching && "animate-spin")} /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Available now" value={tasks.length} icon={ListChecks} tone="sky" />
        <StatTile label="Points up for grabs" value={totalAvailablePoints.toLocaleString()} icon={Coins} tone="purple" />
        <StatTile label="Done today" value={doneToday} icon={CheckCircle2} tone="emerald" />
        <StatTile label="In review" value={inReview} icon={Clock} tone="amber" hint={inReview ? "Waiting for proof approval" : "Nothing pending"} />
      </div>

      <Pills<View>
        value={view}
        onChange={setView}
        className="w-fit"
        options={[
          { value: "available", label: <><ListChecks className="h-4 w-4" /> Available</>, count: tasks.length },
          { value: "history", label: <><History className="h-4 w-4" /> My history</>, count: completed.length },
        ]}
      />

      {view === "available" ? (
        <>
          {/* Filters */}
          <div className="sticky top-14 z-20 -mx-4 space-y-3 border-b bg-background/90 px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-2xl md:border md:bg-card md:p-4 md:shadow-sm" data-tutorial="platform-filters">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks" className="rounded-xl pl-9" />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full rounded-xl sm:w-44">
                  <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="most_points">Most points</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="least_points">Fewest points</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <Chip active={!platform} onClick={() => setPlatform(null)}>All platforms</Chip>
              {PLATFORMS.filter((p) => presentPlatforms.has(p.key)).map((p) => {
                const Icon = p.icon;
                return (
                  <Chip key={p.key} active={platform === p.key} onClick={() => setPlatform(platform === p.key ? null : p.key)} color={p.color}>
                    <Icon className="h-3.5 w-3.5" style={{ color: platform === p.key ? undefined : p.color }} />
                    {p.label}
                  </Chip>
                );
              })}
            </div>
            {(TYPES.some((t) => presentTypes.has(t.type)) || hasOther) && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                <Chip small active={!type} onClick={() => setType(null)}>All types</Chip>
                {TYPES.filter((t) => presentTypes.has(t.type)).map((t) => (
                  <Chip small key={t.type} active={type === t.type} onClick={() => setType(type === t.type ? null : t.type)}>
                    <t.icon className="h-3 w-3" /> {t.label}
                  </Chip>
                ))}
                {hasOther && (
                  <Chip small active={type === "other"} onClick={() => setType("other")}>
                    Other
                  </Chip>
                )}
              </div>
            )}
            {hasFilters && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {filtered.length} of {tasks.length} tasks
                </span>
                <button onClick={clearFilters} className="inline-flex items-center gap-1 font-medium text-purple-600 hover:underline dark:text-purple-400">
                  <X className="h-3.5 w-3.5" /> Clear filters
                </button>
              </div>
            )}
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
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

function Chip({ active, onClick, children, color, small }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-medium transition-colors",
        small ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
        active ? "border-transparent bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"
      )}
      style={active && color ? { background: color, color: "#fff" } : undefined}
    >
      {children}
    </button>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <TasksContent />
    </ProtectedRoute>
  );
}
