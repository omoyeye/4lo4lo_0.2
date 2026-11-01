"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlatformBadge, platformInfo } from "@/components/member/platform";

type TaskProps = {
  id: number;
  title: string;
  description: string;
  points: number;
  platform: string;
  type?: string;
  taskUrl?: string | null;
  onComplete: (taskId: number, clickId?: number) => void;
  completing?: boolean;
};

/**
 * A task as a card. "Start" opens a two-step sheet: open the link (the click
 * is recorded for analytics), then confirm you've done it. Previously the task
 * completed itself half a second after the link opened, before the member had
 * done anything.
 */
export default function TaskCard({ id, title, description, points, platform, type, taskUrl, onComplete, completing }: TaskProps) {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [clickId, setClickId] = useState<number | undefined>();
  const info = platformInfo(platform);

  const openTask = async () => {
    if (!taskUrl) return;
    window.open(taskUrl, "_blank", "noopener,noreferrer");
    setOpened(true);
    if (clickId) return;
    try {
      const res = await fetch("/api/tasks/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ taskId: id }),
      });
      if (res.ok) setClickId((await res.json()).id);
    } catch {
      /* analytics only; completing still works */
    }
  };

  const done = () => {
    onComplete(id, clickId);
    setOpen(false);
  };

  return (
    <>
      <article className="group flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md dark:hover:border-purple-800">
        <div className="flex items-start gap-3">
          <PlatformBadge platform={platform} size={44} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              {info.label}
              {type ? <span className="capitalize"> · {type}</span> : null}
            </p>
            <h3 className="mt-0.5 line-clamp-2 font-semibold leading-snug">{title}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-2.5 py-1 text-sm font-bold text-white shadow-sm">+{points}</span>
        </div>
        <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">{description}</p>
        <Button
          onClick={() => {
            setOpened(false);
            setOpen(true);
          }}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
          disabled={completing}
        >
          {completing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Start task
        </Button>
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <PlatformBadge platform={platform} size={44} />
              <div className="text-left">
                <DialogTitle className="text-left leading-snug">{title}</DialogTitle>
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">+{points} points</p>
              </div>
            </div>
            <DialogDescription className="text-left">{description}</DialogDescription>
          </DialogHeader>

          <ol className="space-y-3">
            <li className="flex gap-3 rounded-xl border p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-sm font-bold text-purple-700 dark:text-purple-300">1</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Open the task on {info.label}</p>
                <p className="text-xs text-muted-foreground">Use your own account and complete the action ({type || "engage"}).</p>
                <Button size="sm" variant="outline" className="mt-2 rounded-lg" onClick={openTask} disabled={!taskUrl}>
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  {taskUrl ? (opened ? "Open again" : "Open task") : "No link for this task"}
                </Button>
              </div>
            </li>
            <li className="flex gap-3 rounded-xl border p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-sm font-bold text-purple-700 dark:text-purple-300">2</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Come back and confirm</p>
                <p className="text-xs text-muted-foreground">Undoing the action later (unfollow, unlike) can remove the points.</p>
              </div>
            </li>
          </ol>

          <DialogFooter>
            <Button onClick={done} disabled={!opened || completing} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {opened ? "I've done it" : "Open the task first"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
