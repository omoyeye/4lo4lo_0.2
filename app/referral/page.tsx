"use client";
import { EmptyState, MemberLayout, PageHeader, Section, StatTile } from "@/components/member/kit";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Copy, Share2, Download, User, TrendingUp, Star, Users, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { useQuery } from "@tanstack/react-query";

type ReferralTier = {
  id: number;
  label: string;
  minReferrals: number;
  maxReferrals: number | null;
  multiplier: string;
};

type UserTierInfo = {
  tier: ReferralTier | null;
  nextTier: ReferralTier | null;
  totalReferrals: number;
};

function ReferralContent() {
  const { toast } = useToast();
  const [username, setUsername] = useState<string>("uniquegram");
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    coinsEarned: 0,
    referralCode: ''
  });

  const [referralHistory, setReferralHistory] = useState<Array<{
    id: number;
    referredUsername: string;
    referredAt: Date;
    pointsEarned: number;
    status: string;
  }>>([]);

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const idCardRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();

  const { data: userTierInfo } = useQuery<UserTierInfo>({
    queryKey: ["/api/user/referral-tier"],
    enabled: !!user?.id,
  });

  const { data: allTiers = [] } = useQuery<ReferralTier[]>({
    queryKey: ["/api/referral-tiers"],
    enabled: !!user?.id,
  });

  // Fetch referral stats
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/referral/${user.id}`)
        .then(res => res.json())
        .then(data => {
          setReferralStats(data);
        })
        .catch(error => {
          console.error('Failed to fetch referral stats:', error);
          toast({
            title: "Error",
            description: "Failed to load referral statistics",
            variant: "destructive",
          });
        });
    }
  }, [user?.id, toast]);

  // Fetch referral history
  useEffect(() => {
    if (user?.id) {
      setIsLoadingHistory(true);
      fetch(`/api/referral/${user.id}/history`)
        .then(res => res.json())
        .then(data => {
          // Convert date strings to Date objects
          const processedData = data.map((item: any) => ({
            ...item,
            referredAt: new Date(item.referredAt)
          }));
          setReferralHistory(processedData);
        })
        .catch(error => {
          console.error('Failed to fetch referral history:', error);
          toast({
            title: "Error",
            description: "Failed to load referral history",
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsLoadingHistory(false);
        });
    }
  }, [user?.id, toast]);

  // Use the referral code from the database
  const referralLink = `${typeof window !== "undefined" ? window.location.origin : "https://4lo4lo.site"}/auth?ref=${referralStats.referralCode}`;

  // Update username from localStorage on component mount
  useEffect(() => {
    const storedUsername = (typeof window !== 'undefined' ? localStorage.getItem("username") : null);
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  // Handle copy link
  const handleCopyLink = () => {
    const message = `Want to make money and grow your socials? Use my referral code ${referralStats.referralCode} on sign up or click this link: ${referralLink} to start your journey!`;

    navigator.clipboard.writeText(message).then(() => {
      toast({
        title: "Copied!",
        description: "Referral message copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Failed to copy",
        description: "Could not copy the message to clipboard",
        variant: "destructive",
      });
    });
  };

  // Handle share link
  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join me on 4LO4LO',
        text: `Want to make money and grow your socials? Use my referral code ${referralStats.referralCode} on sign up or click this link to start your journey!`,
        url: referralLink,
      }).catch(() => {
        toast({
          title: "Failed to share",
          description: "Could not open share dialog",
          variant: "destructive",
        });
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      handleCopyLink();
    }
  };

  // Handle download ID card
  const handleDownloadIdCard = async () => {
    if (!idCardRef.current) return;

    try {
      const canvas = await html2canvas(idCardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `4LO4LO-ID-${user?.username || 'user'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({
        title: "Success!",
        description: "Your digital ID card has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download ID card",
        variant: "destructive",
      });
    }
  };

  const tier = userTierInfo?.tier ?? null;
  const nextTier = userTierInfo?.nextTier ?? null;
  const tierProgress = nextTier
    ? Math.min(100, ((userTierInfo!.totalReferrals - (tier?.minReferrals ?? 0)) / Math.max(1, nextTier.minReferrals - (tier?.minReferrals ?? 0))) * 100)
    : 100;

  return (
    <MemberLayout>
      <PageHeader icon={Share2} tone="pink" title="Invite Friends" description="Share your link. When friends join and take part, you earn." />

      {/* Share first: it's what people come here to do. */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 via-purple-600 to-pink-600 p-5 text-white shadow-xl md:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10" />
        <div className="relative grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div className="min-w-0">
            <p className="text-sm text-white/80">Your referral code</p>
            <p className="text-3xl font-extrabold tracking-widest md:text-4xl">{referralStats.referralCode || "…"}</p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/15 p-1.5 pl-3">
              <p className="min-w-0 flex-1 truncate text-sm text-white/90">{referralLink}</p>
              <Button size="sm" onClick={handleCopyLink} className="shrink-0 rounded-lg bg-white text-purple-700 hover:bg-white/90">
                <Copy className="mr-1.5 h-4 w-4" /> Copy
              </Button>
            </div>
          </div>
          <div className="flex gap-2 md:flex-col">
            <Button onClick={handleShareLink} className="flex-1 rounded-xl bg-white text-purple-700 hover:bg-white/90">
              <Share2 className="mr-1.5 h-4 w-4" /> Share invite
            </Button>
            <Button variant="outline" onClick={handleDownloadIdCard} className="flex-1 rounded-xl border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white" data-testid="button-download-id">
              <Download className="mr-1.5 h-4 w-4" /> ID card
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["1", "Share your link", "Send it to friends or post it with your share card."],
          ["2", "They join", "They sign up with your link or type your code."],
          ["3", "You earn", "Rewards land as they take part, boosted by your tier."],
        ].map(([n, title, body]) => (
          <div key={n} className="flex gap-3 rounded-2xl border bg-card p-4 shadow-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-sm font-bold text-white">{n}</span>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Friends invited" value={referralStats.totalReferrals ?? 0} icon={Users} tone="pink" />
        <StatTile label="Rewards earned" value={Number(referralStats.coinsEarned ?? 0).toLocaleString()} icon={Coins} tone="emerald" />
        <StatTile label="Current tier" value={tier?.label ?? "None yet"} icon={Star} tone="purple" />
        <StatTile label="Multiplier" value={`${tier ? parseFloat(tier.multiplier).toFixed(2) : "1.00"}×`} icon={TrendingUp} tone="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {allTiers.length > 0 && (
            <Section title="Your tier" description={nextTier ? `${Math.max(0, nextTier.minReferrals - (userTierInfo?.totalReferrals ?? 0))} more to reach ${nextTier.label}` : tier ? "You're on the top tier" : undefined}>
              {nextTier && (
                <div className="mb-4">
                  <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>{tier?.label ?? "Start"}</span>
                    <span>
                      {nextTier.label} · {parseFloat(nextTier.multiplier).toFixed(2)}×
                    </span>
                  </div>
                  <Progress value={tierProgress} className="h-2.5" />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {allTiers.map((t) => {
                  const active = tier?.id === t.id;
                  return (
                    <span
                      key={t.id}
                      className={`rounded-xl border px-3 py-1.5 text-xs ${active ? "border-purple-400 bg-purple-500/10 font-semibold text-purple-700 dark:text-purple-300" : "text-muted-foreground"}`}
                    >
                      {t.label} · {t.minReferrals}
                      {t.maxReferrals ? `–${t.maxReferrals}` : "+"} · {parseFloat(t.multiplier).toFixed(2)}×
                    </span>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="People you invited" bodyClassName="p-2 sm:p-3">
            {isLoadingHistory ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : referralHistory.length === 0 ? (
              <EmptyState icon={Users} title="No referrals yet" description="Share your link above. Everyone who joins with it shows up here." />
            ) : (
              <ul className="divide-y">
                {referralHistory.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-sm font-semibold text-purple-700 dark:text-purple-300">
                      {r.referredUsername.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.referredUsername}</p>
                      <p className="text-xs text-muted-foreground">Joined {r.referredAt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">+{r.pointsEarned}</p>
                      <p className="text-xs capitalize text-muted-foreground">{r.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <Section title="Your ID card" description="Download it and share it anywhere." action={<Button variant="ghost" size="sm" onClick={handleDownloadIdCard}><Download className="h-4 w-4" /></Button>}>
          <div ref={idCardRef} className="rounded-2xl border bg-white p-5 text-center shadow-sm dark:bg-gray-900">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white">
              <User className="h-7 w-7" />
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{user?.username || username}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">4LO4LO member</p>
            <div className="my-4 flex justify-center">
              <div className="rounded-xl bg-white p-2.5">
                <QRCodeSVG value={referralLink} size={132} level="H" includeMargin={false} />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Code</p>
            <p className="text-lg font-bold tracking-widest text-purple-700">{referralStats.referralCode || "…"}</p>
            <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">Scan or enter the code when you sign up</p>
          </div>
        </Section>
      </div>
    </MemberLayout>
  );
}



﻿import { ProtectedRoute } from "@/lib/protected-route";
export default function Page() {
  return (
    <ProtectedRoute>
      <ReferralContent />
    </ProtectedRoute>
  );
}

