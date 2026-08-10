"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";

/**
 * Follow / unfollow control.
 *
 * The follower count is passed in from the server, because it is the same for
 * every viewer and is cached with the profile page. Whether THIS viewer
 * follows the profile is fetched on mount instead: the profile page is
 * ISR-cached as the site's main SEO surface, so baking session-dependent state
 * into that render would serve one person's follow state to everyone.
 *
 * The toggle is optimistic and reverts on failure. Following is low stakes and
 * instantly reversible, so blocking the UI on a round trip is the wrong trade.
 */
export function FollowButton({
  username,
  initialFollowers,
}: {
  username: string;
  initialFollowers: number;
}) {
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(initialFollowers);
  const [isSelf, setIsSelf] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/follow?username=${encodeURIComponent(username)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) {
          if (!cancelled) setReady(true);
          return;
        }
        setFollowing(Boolean(data.following));
        setIsSelf(Boolean(data.isSelf));
        if (typeof data.followers === "number") setFollowers(data.followers);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  const toggle = async () => {
    const next = !following;

    setBusy(true);
    setFollowing(next);
    setFollowers((n) => Math.max(0, n + (next ? 1 : -1)));

    const revert = () => {
      setFollowing(!next);
      setFollowers((n) => Math.max(0, n + (next ? -1 : 1)));
    };

    try {
      const res = await fetch("/api/follow", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        revert();

        if (res.status === 401) {
          toast({
            title: "Sign in to follow",
            description: "Create a free account to follow creators.",
          });
          router.push("/signup");
          return;
        }

        toast({
          title:
            res.status === 503 ? "Following is not switched on yet" : "Could not update",
          description: data.message ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Trust the server's numbers over the optimistic guess.
      if (typeof data.followers === "number") setFollowers(data.followers);
      if (typeof data.following === "boolean") setFollowing(data.following);
    } catch {
      revert();
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Your own profile has no follow button, but the count still belongs there.
  if (ready && isSelf) {
    return (
      <span className="text-sm text-muted-foreground">
        <strong className="tabular-nums text-foreground">{followers}</strong>{" "}
        {followers === 1 ? "follower" : "followers"}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={toggle}
        // Disabled until state is known, so it cannot be clicked into the
        // wrong direction during the initial fetch.
        disabled={busy || !ready}
        variant={following ? "outline" : "default"}
        className={
          following
            ? ""
            : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
        }
      >
        {busy || !ready ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : following ? (
          <UserCheck className="mr-2 h-4 w-4" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        {following ? "Following" : "Follow"}
      </Button>

      <span className="text-sm text-muted-foreground">
        <strong className="tabular-nums text-foreground">{followers}</strong>{" "}
        {followers === 1 ? "follower" : "followers"}
      </span>
    </div>
  );
}
