"use client";

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { Heart, Loader2, MessageCircle, MoreHorizontal, Send, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/member/kit";

const POST_MAX = 250;
const COMMENT_MAX = 100;
const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

interface Author {
  id: number;
  username: string;
  displayName: string | null;
  avatar: string | null;
  level: number;
}
interface Post {
  id: number;
  body: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  likedByMe: boolean;
  author: Author;
}
interface Comment {
  id: number;
  body: string;
  createdAt: string;
  author: Author;
}
interface Page {
  enabled: boolean;
  posts: Post[];
  nextCursor: number | null;
}

async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data as T;
}

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function Avatar({ a, size = 40 }: { a: Author; size?: number }) {
  const name = a.displayName || a.username;
  return a.avatar ? (
    <img src={a.avatar} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function Counter({ used, max }: { used: number; max: number }) {
  return <span className={cn("text-xs tabular-nums", used > max ? "font-semibold text-destructive" : used > max * 0.9 ? "text-amber-600" : "text-muted-foreground")}>{used}/{max} words</span>;
}

const refresh = () => queryClient.invalidateQueries({ queryKey: ["community-posts"] });

function Composer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const n = words(text);
  const publish = useMutation({
    mutationFn: () => api("/api/community/posts", { method: "POST", json: { body: text } }),
    onSuccess: () => {
      setText("");
      refresh();
      toast({ title: "Posted" });
    },
    onError: (e: Error) => toast({ title: "Couldn't post", description: e.message, variant: "destructive" }),
  });
  if (!user) return null;
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar a={{ id: user.id, username: user.username, displayName: user.displayName ?? null, avatar: user.avatar ?? null, level: user.level }} />
        <div className="min-w-0 flex-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share a tip, a win, or ask the community something…"
            rows={3}
            className="resize-none rounded-xl border-0 bg-muted/50 focus-visible:ring-1"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <Counter used={n} max={POST_MAX} />
            <Button
              size="sm"
              disabled={!n || n > POST_MAX || publish.isPending}
              onClick={() => publish.mutate()}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            >
              {publish.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Post
            </Button>
          </div>
        </div>
      </div>
      <p className="mt-2 pl-[52px] text-xs text-muted-foreground">Be kind. No spam, scams or asking for engagement swaps. Breaking the rules can get posts removed.</p>
    </div>
  );
}

function Comments({ post, canModerate }: { post: Post; canModerate: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const n = words(text);
  const key = ["community-comments", post.id];
  const { data: comments = [], isLoading } = useQuery<Comment[]>({ queryKey: key, queryFn: () => api(`/api/community/posts/${post.id}/comments`) });

  const add = useMutation({
    mutationFn: () => api(`/api/community/posts/${post.id}/comments`, { method: "POST", json: { body: text } }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: key });
      refresh();
    },
    onError: (e: Error) => toast({ title: "Couldn't comment", description: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/community/comments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      refresh();
    },
    onError: (e: Error) => toast({ title: "Couldn't delete", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="group flex gap-2.5">
            <Avatar a={c.author} size={30} />
            <div className="min-w-0 flex-1 rounded-2xl bg-muted/60 px-3 py-2">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${c.author.username}`} className="truncate text-sm font-semibold hover:underline">
                  {c.author.displayName || c.author.username}
                </Link>
                <span className="text-xs text-muted-foreground">{ago(c.createdAt)}</span>
                {(c.author.id === user?.id || canModerate) && (
                  <button onClick={() => remove.mutate(c.id)} className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" aria-label="Delete comment">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
            </div>
          </div>
        ))
      )}
      <form
        className="flex items-start gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (n && n <= COMMENT_MAX) add.mutate();
        }}
      >
        <div className="min-w-0 flex-1">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment…" rows={1} className="min-h-[40px] resize-none rounded-xl" />
          {text && <Counter used={n} max={COMMENT_MAX} />}
        </div>
        <Button type="submit" size="icon" disabled={!n || n > COMMENT_MAX || add.isPending} className="h-10 w-10 shrink-0 rounded-xl" aria-label="Send comment">
          {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

function PostCard({ post, canModerate }: { post: Post; canModerate: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likeCount);

  const like = useMutation({
    mutationFn: () => api<{ liked: boolean; likeCount: number }>(`/api/community/posts/${post.id}/like`, { method: "POST" }),
    onMutate: () => {
      // Optimistic: flip straight away, settle to the server's numbers after.
      setLiked((v) => !v);
      setLikes((n) => n + (liked ? -1 : 1));
    },
    onSuccess: (r) => {
      setLiked(r.liked);
      setLikes(r.likeCount);
    },
    onError: (e: Error) => {
      setLiked(post.likedByMe);
      setLikes(post.likeCount);
      toast({ title: "Couldn't like", description: e.message, variant: "destructive" });
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/api/community/posts/${post.id}`, { method: "DELETE" }),
    onSuccess: () => {
      refresh();
      toast({ title: "Post deleted" });
    },
    onError: (e: Error) => toast({ title: "Couldn't delete", description: e.message, variant: "destructive" }),
  });

  const name = post.author.displayName || post.author.username;
  return (
    <article className="rounded-2xl border bg-card p-4 shadow-sm">
      <header className="flex items-center gap-3">
        <Avatar a={post.author} />
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${post.author.username}`} className="block truncate font-semibold hover:underline">
            {name}
          </Link>
          <p className="text-xs text-muted-foreground">
            @{post.author.username} · Lv {post.author.level} · {ago(post.createdAt)}
          </p>
        </div>
        {(post.author.id === user?.id || canModerate) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="Post options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => remove.mutate()}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.body}</p>
      <div className="mt-3 flex items-center gap-1 border-t pt-2">
        <button
          onClick={() => like.mutate()}
          className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted", liked ? "text-pink-600" : "text-muted-foreground")}
          aria-pressed={liked}
        >
          <Heart className={cn("h-4 w-4 transition-transform", liked && "scale-110 fill-current")} />
          {likes > 0 ? likes : "Like"}
        </button>
        <button onClick={() => setShowComments((v) => !v)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted">
          <MessageCircle className="h-4 w-4" />
          {post.commentCount > 0 ? post.commentCount : "Comment"}
        </button>
      </div>
      {showComments && <Comments post={post} canModerate={canModerate} />}
    </article>
  );
}

/** Composer + newest-first posts with infinite "Load more". */
export function CommunityPosts({ canModerate = false }: { canModerate?: boolean }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<Page>({
    queryKey: ["community-posts"],
    queryFn: ({ pageParam }) => api(`/api/community/posts${pageParam ? `?before=${pageParam}` : ""}`),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: 60_000,
  });
  const enabled = data?.pages[0]?.enabled !== false;
  const posts = data?.pages.flatMap((p) => p.posts) ?? [];

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Posting isn&apos;t switched on yet. It will appear here as soon as it is.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Composer />
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl border bg-muted/40" />)
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border bg-card">
          <EmptyState icon={Users} title="No posts yet" description="Be the first to share something with the community." />
        </div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} canModerate={canModerate} />)
      )}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" className="rounded-xl" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
