"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import SEO from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import {
  Award, Star, Shield, CheckCircle, Crown, Flame, Trophy,
  UserPlus, Users, Share2, BookOpen, GraduationCap, Coins, Gem, Zap,
  Globe, Lock, User as UserIcon, Calendar, ArrowLeft, TrendingUp,
  Plus, Trash2, ExternalLink, Edit2, Check, X, Copy, Link2,
} from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";

type ProfileLink = {
  id: number;
  userId: number;
  title: string;
  url: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
};

type ProfileData = {
  user: {
    id: number;
    username: string;
    displayName: string | null;
    points: number;
    level: number;
    streakCount: number;
    globalRank: number | null;
    facebook_handle: string | null;
    instagram_handle: string | null;
    tiktok_handle: string | null;
    youtube_handle: string | null;
    createdAt: string;
    isPublic: boolean;
  };
  badges: {
    id: number;
    userId: number;
    badgeKey: string;
    earnedAt: string;
    badge: {
      key: string;
      title: string;
      description: string;
      iconName: string;
      pointsBonus: number;
    };
  }[];
  links: ProfileLink[];
};

type LevelHistoryEntry = {
  id: number;
  userId: number;
  level: number;
  reachedAt: string;
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? "s" : ""} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? "s" : ""} ago`;
}

const BADGE_ICON_MAP: Record<string, React.ReactNode> = {
  "check-circle":   <CheckCircle className="w-5 h-5" />,
  "shield":         <Shield className="w-5 h-5" />,
  "star":           <Star className="w-5 h-5" />,
  "trophy":         <Trophy className="w-5 h-5" />,
  "flame":          <Flame className="w-5 h-5" />,
  "zap":            <Zap className="w-5 h-5" />,
  "crown":          <Crown className="w-5 h-5" />,
  "user-plus":      <UserPlus className="w-5 h-5" />,
  "users":          <Users className="w-5 h-5" />,
  "share-2":        <Share2 className="w-5 h-5" />,
  "book-open":      <BookOpen className="w-5 h-5" />,
  "graduation-cap": <GraduationCap className="w-5 h-5" />,
  "coins":          <Coins className="w-5 h-5" />,
  "gem":            <Gem className="w-5 h-5" />,
};

function EditLinkRow({ link, onDone }: { link: ProfileLink; onDone: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const [isActive, setIsActive] = useState(link.isActive);

  const updateMutation = useMutation({
    mutationFn: (data: { title: string; url: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/profile-links/${link.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile-links"] });
      toast({ title: "Link updated" });
      onDone();
    },
    onError: () => toast({ title: "Failed to update link", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border">
      <div className="flex gap-2">
        <Input placeholder="Label (e.g. My YouTube)" value={title} onChange={e => setTitle(e.target.value)} className="flex-1" />
        <Input placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} className="flex-1" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={isActive} onCheckedChange={setIsActive} id={`active-${link.id}`} />
          <Label htmlFor={`active-${link.id}`}>Show on profile</Label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onDone}><X className="w-4 h-4" /></Button>
          <Button size="sm" onClick={() => updateMutation.mutate({ title, url, isActive })} disabled={updateMutation.isPending}>
            <Check className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProfileContent() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: profile, isLoading, error } = useQuery<ProfileData>({
    queryKey: ["/api/profile", username],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error("Profile not found or private");
      return res.json();
    },
    retry: false,
  });

  const isOwnProfile = currentUser && profile && currentUser.username === profile.user.username;

  const { data: levelHistoryData } = useQuery<LevelHistoryEntry[]>({
    queryKey: ["/api/level-history"],
    enabled: !!isOwnProfile,
  });

  const { data: ownLinks } = useQuery<ProfileLink[]>({
    queryKey: ["/api/profile-links"],
    enabled: !!isOwnProfile,
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; url: string }) =>
      apiRequest("POST", "/api/profile-links", { ...data, isActive: true, displayOrder: (ownLinks?.length ?? 0) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile", username] });
      toast({ title: "Link added to your profile!" });
      setNewTitle("");
      setNewUrl("");
      setShowAddForm(false);
    },
    onError: () => toast({ title: "Failed to add link", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/profile-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile", username] });
      toast({ title: "Link removed" });
    },
    onError: () => toast({ title: "Failed to remove link", variant: "destructive" }),
  });

  const profileUrl = `https://www.4lo4lo.site/profile/${username}`;

  const copyProfileUrl = () => {
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Profile link copied!" });
    });
  };

  const initials = (profile?.user?.username || username || "?").substring(0, 2).toUpperCase();
  const joinDate = profile?.user?.createdAt
    ? new Date(profile.user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  const displayLinks = isOwnProfile ? (ownLinks ?? []) : (profile?.links ?? []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={profile ? `${profile.user.username}'s Profile | 4LO4LO` : "Profile | 4LO4LO"}
        description={`View ${username}'s public profile, links, achievements and badges on 4LO4LO.`}
      />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <div className="bg-card rounded-xl p-8">
              <div className="flex items-center gap-6">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          </div>
        ) : error || !profile ? (
          <div className="bg-card rounded-xl p-12 text-center">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
            <p className="text-muted-foreground text-sm mb-6">
              This profile doesn't exist or has been set to private.
            </p>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-card rounded-xl p-8 border">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-purple-600/30 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold">{profile.user.username}</h1>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Globe className="w-3 h-3" />
                      <span>Public profile</span>
                    </div>
                  </div>
                  {profile.user.displayName && (
                    <p className="text-muted-foreground text-sm mb-2">{profile.user.displayName}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Member since {joinDate}</span>
                  </div>

                  {/* Social handles */}
                  {(profile.user.facebook_handle || profile.user.instagram_handle || profile.user.tiktok_handle || profile.user.youtube_handle) && (
                    <div className="flex gap-3 mt-3 justify-center sm:justify-start">
                      {profile.user.facebook_handle && (
                        <span className="flex items-center gap-1 text-xs text-blue-600">
                          <SiFacebook className="w-3 h-3" /> {profile.user.facebook_handle}
                        </span>
                      )}
                      {profile.user.instagram_handle && (
                        <span className="flex items-center gap-1 text-xs text-pink-600">
                          <SiInstagram className="w-3 h-3" /> {profile.user.instagram_handle}
                        </span>
                      )}
                      {profile.user.tiktok_handle && (
                        <span className="flex items-center gap-1 text-xs">
                          <SiTiktok className="w-3 h-3" /> {profile.user.tiktok_handle}
                        </span>
                      )}
                      {profile.user.youtube_handle && (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <SiYoutube className="w-3 h-3" /> {profile.user.youtube_handle}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Share Your Profile (own profile only) ── */}
            {isOwnProfile && (
              <div className="bg-gradient-to-r from-primary/10 to-purple-600/10 border border-primary/20 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Link2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base">Your Public Profile Link</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Use this link in your social media bios so followers can see all your links in one place, just like Linktree.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <code className="flex-1 bg-background border rounded-lg px-3 py-2 text-sm text-muted-foreground truncate">
                    {profileUrl}
                  </code>
                  <Button size="sm" onClick={copyProfileUrl} className="gap-1.5 flex-shrink-0">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  💡 <strong>Tip:</strong> Paste this link in your Instagram bio, TikTok bio, Twitter/X bio, or YouTube "About" section so your audience can find everything in one tap.
                </p>
              </div>
            )}

            {/* ── Linktree Links ── */}
            {isOwnProfile ? (
              <div className="bg-card rounded-xl p-6 border space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-primary" />
                    My Links
                  </h2>
                  <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-1.5">
                    <Plus className="w-4 h-4" /> Add Link
                  </Button>
                </div>

                {showAddForm && (
                  <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Label (e.g. My YouTube)"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="https://..."
                        value={newUrl}
                        onChange={e => setNewUrl(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewTitle(""); setNewUrl(""); }}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => createMutation.mutate({ title: newTitle, url: newUrl })}
                        disabled={createMutation.isPending || !newTitle.trim() || !newUrl.trim()}
                      >
                        {createMutation.isPending ? "Adding…" : "Add Link"}
                      </Button>
                    </div>
                  </div>
                )}

                {(ownLinks ?? []).length === 0 && !showAddForm ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Link2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No links yet. Add your first link above.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(ownLinks ?? []).map(link => (
                      editingId === link.id ? (
                        <EditLinkRow key={link.id} link={link} onDone={() => setEditingId(null)} />
                      ) : (
                        <div key={link.id} className={`flex items-center gap-3 p-3 rounded-lg border ${link.isActive ? "bg-background" : "bg-muted/30 opacity-60"}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{link.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                          </div>
                          {!link.isActive && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Hidden</span>
                          )}
                          <div className="flex gap-1 flex-shrink-0">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(link.id)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(link.id)} disabled={deleteMutation.isPending}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            ) : displayLinks.length > 0 ? (
              <div className="bg-card rounded-xl p-6 border space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Link2 className="w-5 h-5 text-primary" />
                  Links
                </h2>
                {displayLinks.map(link => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl border bg-background hover:bg-primary/5 hover:border-primary/40 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ExternalLink className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="font-medium text-sm flex-1">{link.title}</span>
                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            ) : null}

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-card rounded-lg p-4 text-center border">
                <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">{(profile.user.points || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Points</p>
              </div>
              <div className="bg-card rounded-lg p-4 text-center border">
                <Award className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">Lv. {profile.user.level || 1}</p>
                <p className="text-xs text-muted-foreground">Level</p>
              </div>
              <div className="bg-card rounded-lg p-4 text-center border">
                <Flame className={`w-5 h-5 mx-auto mb-1 ${(profile.user.streakCount || 0) >= 3 ? "text-orange-500" : "text-muted-foreground"}`} />
                <p className="text-2xl font-bold">{profile.user.streakCount || 0}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
              <div className="bg-card rounded-lg p-4 text-center border">
                <Trophy className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">{profile.badges.length}</p>
                <p className="text-xs text-muted-foreground">Badges</p>
              </div>
              <div className="bg-card rounded-lg p-4 text-center border">
                <UserIcon className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">
                  {profile.user.globalRank ? `#${profile.user.globalRank}` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Global Rank</p>
              </div>
            </div>

            {/* Level Progress Bar */}
            {(() => {
              const points = profile.user.points || 0;
              const level = profile.user.level || 1;
              const progressPct = Math.floor((points % 1000) / 10);
              const pointsInLevel = points % 1000;
              const barColor =
                progressPct >= 70
                  ? "linear-gradient(90deg, #a855f7, #f59e0b)"
                  : progressPct >= 35
                  ? "linear-gradient(90deg, hsl(var(--primary)), #a855f7)"
                  : "hsl(var(--primary))";
              const labelColor =
                progressPct >= 70 ? "#f59e0b" : progressPct >= 35 ? "#a855f7" : "hsl(var(--primary))";
              return (
                <div className="bg-card rounded-xl p-5 border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Award className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold">Level {level}</span>
                        <span className="text-xs text-muted-foreground ml-2">→ Level {level + 1}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: labelColor }}>
                        {progressPct}%
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {pointsInLevel} / 1000 pts
                      </p>
                    </div>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${progressPct}%`, background: barColor }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {1000 - pointsInLevel} more points to reach Level {level + 1}
                  </p>
                </div>
              );
            })()}

            {/* Badges */}
            {profile.badges.length > 0 && (
              <div className="bg-card rounded-xl p-6 border">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Achievements
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {profile.badges.map((ub) => (
                    <div
                      key={ub.id}
                      className="bg-yellow-500/5 border border-yellow-400/30 rounded-lg p-3 flex flex-col items-center text-center gap-2"
                    >
                      <div className="w-9 h-9 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center">
                        {BADGE_ICON_MAP[ub.badge.iconName] || <Award className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{ub.badge.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(ub.earnedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Level History — only shown to the profile owner */}
            {isOwnProfile && levelHistoryData && levelHistoryData.length > 0 && (
              <div className="bg-card rounded-xl p-6 border">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Level History
                </h2>
                <ol className="relative border-l border-border ml-3 space-y-4">
                  {[...levelHistoryData].reverse().map((entry) => (
                    <li key={entry.id} className="ml-4">
                      <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">Reached Level {entry.level}</span>
                        <span
                          className="text-xs text-muted-foreground"
                          title={new Date(entry.reachedAt).toLocaleString()}
                        >
                          {formatRelativeTime(entry.reachedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(entry.reachedAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}




export default function Page() {
  return <ProfileContent />;
}

