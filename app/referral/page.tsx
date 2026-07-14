"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Copy, Share2, Download, User, TrendingUp, Star } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
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
  }, []);

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
  const referralLink = `${window.location.origin}/signup?ref=${referralStats.referralCode}`;

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
        title: 'Join Social Growth Platform',
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

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background text-foreground">
      <SEO 
        title="Referral Program - Invite Friends & Earn Rewards" 
        description="Invite your friends to join our social media platform and earn rewards. Get bonus points for each friend who joins using your referral link."
        keywords="referral program, invite friends, earn rewards, referral bonus, referral link"
        url="/referral"
      />
      <Sidebar />

      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header */}
          <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">Invite Friends</h1>

          {/* Stats */}
          <div className="mb-6 md:mb-8 bg-card rounded-lg p-4 md:p-6">
            <div className="grid grid-cols-2 gap-3 md:gap-4 text-center">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Total Referrals</p>
                <p className="text-2xl md:text-3xl font-bold">{referralStats.totalReferrals}</p>
              </div>

              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Coins Earned</p>
                <p className="text-2xl md:text-3xl font-bold text-green-500 dark:text-green-400">{referralStats.coinsEarned}</p>
              </div>
            </div>
          </div>

          {/* Referral Tier Section */}
          {allTiers.length > 0 && (
            <div className="mb-6 md:mb-8 bg-card rounded-lg p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-base md:text-lg font-medium">Referral Tier</h2>
              </div>

              {/* Current tier badge + multiplier */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    userTierInfo?.tier ? "bg-primary/20" : "bg-muted"
                  }`}>
                    <Star className={`h-5 w-5 ${userTierInfo?.tier ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm md:text-base">
                      {userTierInfo?.tier ? userTierInfo.tier.label : "No tier yet"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {userTierInfo?.tier
                        ? `${parseFloat(userTierInfo.tier.multiplier).toFixed(2)}× reward multiplier`
                        : `Refer ${allTiers[0]?.minReferrals ?? 1} friend(s) to reach your first tier`}
                    </p>
                  </div>
                </div>
                {userTierInfo?.tier && (
                  <span className="text-sm font-bold text-primary">
                    {parseFloat(userTierInfo.tier.multiplier).toFixed(2)}×
                  </span>
                )}
              </div>

              {/* Progress to next tier */}
              {userTierInfo?.nextTier && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{userTierInfo.totalReferrals} referrals</span>
                    <span>Next tier: {userTierInfo.nextTier.label} ({userTierInfo.nextTier.minReferrals} needed)</span>
                  </div>
                  <Progress
                    value={Math.min(
                      ((userTierInfo.totalReferrals - (userTierInfo.tier?.minReferrals ?? 0)) /
                        (userTierInfo.nextTier.minReferrals - (userTierInfo.tier?.minReferrals ?? 0))) * 100,
                      100
                    )}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {Math.max(0, userTierInfo.nextTier.minReferrals - userTierInfo.totalReferrals)} more referral(s) to reach {userTierInfo.nextTier.label} ({parseFloat(userTierInfo.nextTier.multiplier).toFixed(2)}× multiplier)
                  </p>
                </div>
              )}

              {/* Tier table */}
              <div className="border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">All Tiers</p>
                <div className="space-y-2">
                  {allTiers.map((tier) => {
                    const isActive = userTierInfo?.tier?.id === tier.id;
                    return (
                      <div
                        key={tier.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                          isActive ? "bg-primary/10 border border-primary/30" : "bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isActive && <Star className="h-3.5 w-3.5 text-primary" />}
                          <span className={`font-medium ${isActive ? "text-primary" : ""}`}>{tier.label}</span>
                          <span className="text-muted-foreground text-xs">
                            {tier.minReferrals}–{tier.maxReferrals ?? "∞"} referrals
                          </span>
                        </div>
                        <span className={`font-bold text-xs px-2 py-0.5 rounded ${
                          parseFloat(tier.multiplier) >= 2
                            ? "bg-yellow-500/20 text-yellow-600"
                            : parseFloat(tier.multiplier) >= 1.5
                            ? "bg-blue-500/20 text-blue-600"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {parseFloat(tier.multiplier).toFixed(2)}×
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Digital ID Card */}
          <div className="mb-6 md:mb-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-lg p-4 md:p-6 border-2 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base md:text-lg font-medium">Digital ID Card</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadIdCard}
                className="gap-2"
                data-testid="button-download-id"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </div>
            
            <div 
              ref={idCardRef} 
              className="bg-white dark:bg-gray-900 rounded-xl p-6 md:p-8 shadow-xl border-2 border-primary/30"
            >
              {/* Card Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full mb-3">
                  <User className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {user?.username || username}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">4LO4LO Member</p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-6">
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG 
                    value={referralLink} 
                    size={160}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* Referral Details */}
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Referral Code</p>
                  <p className="text-lg md:text-xl font-bold text-primary text-center tracking-wider">
                    {referralStats.referralCode || 'Loading...'}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Referral URL</p>
                  <p className="text-xs md:text-sm text-gray-900 dark:text-white break-all text-center">
                    {referralLink}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Scan QR code or use referral code to join
                </p>
              </div>
            </div>
          </div>

          {/* Referral Link */}
          <div className="mb-6 md:mb-8 bg-card rounded-lg p-4 md:p-6">
            <h2 className="text-base md:text-lg font-medium mb-3 md:mb-4">Your Referral Link</h2>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
              <div className="bg-muted rounded p-2 flex-1 overflow-hidden">
                <p className="text-muted-foreground text-xs sm:text-sm truncate break-all">{referralLink}</p>
              </div>

              <div className="flex gap-2 sm:gap-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 sm:flex-none text-xs sm:text-sm gap-2"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4" />
                  <span className="sm:hidden">Copy</span>
                </Button>

                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 sm:flex-none text-xs sm:text-sm gap-2"
                  onClick={handleShareLink}
                >
                  <Share2 className="h-4 w-4" />
                  <span className="sm:hidden">Share</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Referral History */}
          <div className="bg-card rounded-lg p-4 md:p-6">
            <h2 className="text-base md:text-lg font-medium mb-3 md:mb-4">Referral History</h2>

            {isLoadingHistory ? (
              <div className="text-center py-6 md:py-8">
                <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-xs md:text-sm text-muted-foreground mt-2">Loading referral history...</p>
              </div>
            ) : referralHistory.length > 0 ? (
              <div className="space-y-3">
                {referralHistory.map((referral) => (
                  <div 
                    key={referral.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-medium text-sm md:text-base">
                          {referral.referredUsername.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm md:text-base truncate">
                          {referral.referredUsername}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Joined {referral.referredAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-green-500 dark:text-green-400 font-medium">
                        +{referral.pointsEarned} coins
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {referral.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No referrals yet. Share your link to start earning!</p>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </div>
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

