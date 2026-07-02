import { Award, Users, Globe, Zap, ArrowLeft, DollarSign, Gift, CheckCircle, Clock, XCircle, GraduationCap, BookOpen, Shield, Star, Crown, Flame, Trophy, UserPlus, Share2, Coins, Gem, BookMarked, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Reward = {
  id: string;
  title: string;
  description: string;
  points: number;
  icon: string;
  unlocked: boolean;
  progress: number;
};

type ReferralRewardInfo = {
  totalReferrals: number;
  claimableReferrals: number;
  claimableAmount: string;
  eligibleToClaim: boolean;
};

type ClaimHistory = {
  id: number;
  referralCount: number;
  amount: string;
  status: string;
  requestedAt: string;
  processedAt: string | null;
};

type BadgeDef = {
  id: number;
  key: string;
  title: string;
  description: string;
  iconName: string;
  condition: { type: string; threshold: number };
  pointsBonus: number;
};

type UserBadgeRecord = {
  id: number;
  userId: number;
  badgeKey: string;
  earnedAt: string;
  badge: BadgeDef;
};

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

export default function Rewards() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: rewards = [], isLoading } = useQuery<Reward[]>({
    queryKey: ['/api/rewards', { userId: user?.id }],
    enabled: !!user?.id
  });

  type ClassroomVideoStatus = { id: number; title: string; pointsReward: number; completed: boolean };
  const { data: classroomVideos = [], isLoading: isLoadingClassroom } = useQuery<ClassroomVideoStatus[]>({
    queryKey: ['/api/classroom/videos'],
    enabled: !!user?.id
  });
  const classroomTotal = classroomVideos.length;
  const classroomCompleted = classroomVideos.filter((v) => v.completed).length;
  const classroomPoints = classroomVideos.filter((v) => v.completed).reduce((sum, v) => sum + v.pointsReward, 0);
  const classroomProgress = classroomTotal > 0 ? Math.round((classroomCompleted / classroomTotal) * 100) : 0;

  const { data: referralRewardInfo, isLoading: isLoadingReferralReward } = useQuery<ReferralRewardInfo>({
    queryKey: ['/api/referral-reward', user?.id],
    enabled: !!user?.id
  });

  const { data: claimHistory = [] } = useQuery<ClaimHistory[]>({
    queryKey: ['/api/referral-reward/claims', user?.id],
    enabled: !!user?.id
  });

  const { data: allBadges = [], isLoading: isLoadingBadges } = useQuery<BadgeDef[]>({
    queryKey: ['/api/badges'],
    enabled: !!user?.id
  });

  const { data: userBadges = [] } = useQuery<UserBadgeRecord[]>({
    queryKey: ['/api/user/badges'],
    enabled: !!user?.id
  });

  const earnedBadgeKeys = new Set(userBadges.map(ub => ub.badgeKey));

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/referral-reward/claim', { userId: user?.id });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Claim Submitted!",
        description: "Your referral reward claim has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/referral-reward', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/referral-reward/claims', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to submit claim. Please try again.",
        variant: "destructive"
      });
    }
  });

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'globe':
        return <Globe className="w-6 h-6" />;
      case 'zap':
        return <Zap className="w-6 h-6" />;
      case 'users':
        return <Users className="w-6 h-6" />;
      case 'award':
        return <Award className="w-6 h-6" />;
      default:
        return <Award className="w-6 h-6" />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        <div className="flex-grow p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">Rewards</h1>
                <p className="text-muted-foreground">Complete tasks and unlock special rewards</p>
              </div>
              <div className="px-4 py-2 bg-card rounded-lg">
                <p className="text-sm text-muted-foreground">Available Points</p>
                <div className="flex items-center mt-1">
                  <span className="text-xl font-bold">{user?.points || 0}</span>
                  <Award className="w-5 h-5 text-primary ml-2" />
                </div>
              </div>
            </div>
          </div>

          {/* Classroom Rewards Section — always visible */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <GraduationCap className="w-6 h-6 text-purple-500 mr-2" />
              <h2 className="text-xl font-bold">Classroom Points</h2>
            </div>

            <div className="bg-card rounded-lg p-6">
              {isLoadingClassroom ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <>
                  {/* Summary row */}
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mr-4 flex-shrink-0">
                      <GraduationCap className="w-6 h-6 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">Classroom Progress</h3>
                      <p className="text-sm text-muted-foreground">
                        Watch video lessons to earn bonus points and grow your creator skills
                      </p>
                    </div>
                    <div className="text-purple-600 font-bold text-lg ml-4 flex-shrink-0">
                      {classroomPoints} pts
                    </div>
                  </div>

                  <Progress value={classroomProgress} className="h-2 mb-3" />

                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-muted-foreground">
                      {classroomTotal === 0
                        ? "No lessons available yet, check back soon"
                        : `${classroomCompleted} of ${classroomTotal} lessons completed (${classroomProgress}%)`}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => navigate("/classroom")}>
                      Go to Classroom
                    </Button>
                  </div>

                  {/* Per-video breakdown */}
                  {classroomVideos.length > 0 && (
                    <div className="border-t pt-4 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        Lesson Breakdown
                      </p>
                      {classroomVideos.map((video) => (
                        <div
                          key={video.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                              video.completed
                                ? "bg-green-500/20"
                                : "bg-muted"
                            }`}>
                              {video.completed
                                ? <CheckCircle className="w-4 h-4 text-green-500" />
                                : <BookOpen className="w-4 h-4 text-muted-foreground" />
                              }
                            </div>
                            <span className="text-sm truncate">{video.title}</span>
                          </div>
                          <span className={`text-sm font-semibold ml-4 flex-shrink-0 ${
                            video.completed ? "text-green-600" : "text-muted-foreground"
                          }`}>
                            {video.completed ? `+${video.pointsReward} pts` : `${video.pointsReward} pts`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Badges / Achievements Section */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Award className="w-6 h-6 text-yellow-500 mr-2" />
              <h2 className="text-xl font-bold">Achievements</h2>
              <span className="ml-3 text-sm text-muted-foreground">
                {earnedBadgeKeys.size} / {allBadges.length} earned
              </span>
            </div>

            {isLoadingBadges ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
              </div>
            ) : allBadges.length === 0 ? (
              <div className="bg-card rounded-lg p-6 text-center text-muted-foreground text-sm">
                No badges available yet. Start completing tasks to earn them!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {allBadges.map((badge) => {
                  const earned = earnedBadgeKeys.has(badge.key);
                  const earnedRecord = userBadges.find(ub => ub.badgeKey === badge.key);
                  return (
                    <div
                      key={badge.key}
                      className={`relative bg-card rounded-lg p-4 flex flex-col items-center text-center gap-2 border transition-all ${
                        earned
                          ? "border-yellow-400/50 shadow-sm shadow-yellow-400/10"
                          : "border-border opacity-50"
                      }`}
                    >
                      {earned && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        earned ? "bg-yellow-500/20 text-yellow-500" : "bg-muted text-muted-foreground"
                      }`}>
                        {earned ? (BADGE_ICON_MAP[badge.iconName] || <Award className="w-5 h-5" />) : <Lock className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{badge.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-tight">{badge.description}</p>
                        {badge.pointsBonus > 0 && (
                          <p className={`text-xs font-medium mt-1 ${earned ? "text-yellow-500" : "text-muted-foreground"}`}>
                            +{badge.pointsBonus} pts
                          </p>
                        )}
                      </div>
                      {earned && earnedRecord && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(earnedRecord.earnedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Other Rewards */}
          {isLoading ? (
            <div className="text-center py-8">Loading rewards...</div>
          ) : rewards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {rewards.map((reward: Reward) => (
                <div key={reward.id} className="bg-card rounded-lg p-6">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mr-4">
                      {getIconComponent(reward.icon)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{reward.title}</h3>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                    </div>
                    <div className="text-primary font-medium">{reward.points} pts</div>
                  </div>
                  <Progress value={reward.progress} className="h-1 mb-4" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{reward.progress}% Complete</span>
                    <Button
                      variant={reward.unlocked ? "default" : "secondary"}
                      size="sm"
                      disabled={!reward.unlocked}
                      onClick={() => reward.unlocked && navigate("/payments")}
                    >
                      {reward.unlocked ? 'Claim Reward' : 'Locked'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Referral Reward Section */}
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <Gift className="w-6 h-6 text-primary mr-2" />
              <h2 className="text-xl font-bold">Referral Cash Rewards</h2>
            </div>

            {isLoadingReferralReward ? (
              <div className="text-center py-8">Loading referral rewards...</div>
            ) : referralRewardInfo ? (
              <>
                {/* Referral Reward Card - Milestone Style */}
                <div className="bg-card rounded-lg p-6 mb-6">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mr-4">
                      <DollarSign className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Cash Rewards</h3>
                      <p className="text-sm text-muted-foreground">
                        Refer 20 users to unlock cash rewards • Higher tiers earn more per referral
                      </p>
                    </div>
                    <div className="text-green-500 font-medium">
                      ${referralRewardInfo.claimableAmount}
                    </div>
                  </div>

                  <Progress 
                    value={Math.min((referralRewardInfo.totalReferrals / 20) * 100, 100)} 
                    className="h-1 mb-4" 
                  />

                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-muted-foreground">
                      {Math.min(Math.round((referralRewardInfo.totalReferrals / 20) * 100), 100)}% Complete ({referralRewardInfo.totalReferrals}/20 referrals)
                    </span>
                    <Button
                      data-testid="button-claim-referral-reward"
                      variant={referralRewardInfo.eligibleToClaim ? "default" : "secondary"}
                      size="sm"
                      disabled={!referralRewardInfo.eligibleToClaim || claimMutation.isPending}
                      onClick={() => claimMutation.mutate()}
                    >
                      {claimMutation.isPending ? (
                        "Processing..."
                      ) : referralRewardInfo.eligibleToClaim ? (
                        'Claim Reward'
                      ) : (
                        'Locked'
                      )}
                    </Button>
                  </div>

                  {/* Additional Stats */}
                  {referralRewardInfo.totalReferrals >= 20 && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Claimable Referrals</p>
                          <p className="text-lg font-bold">{referralRewardInfo.claimableReferrals}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
                          <p className="text-lg font-bold text-green-500">${referralRewardInfo.claimableAmount}</p>
                        </div>
                      </div>
                      {referralRewardInfo.eligibleToClaim && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-3">
                          ✓ You're eligible to claim your rewards!
                        </p>
                      )}
                    </div>
                  )}

                  {referralRewardInfo.totalReferrals < 20 && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-xs text-muted-foreground">
                        You need {20 - referralRewardInfo.totalReferrals} more referral{20 - referralRewardInfo.totalReferrals !== 1 ? 's' : ''} to unlock cash rewards.
                      </p>
                    </div>
                  )}
                </div>

                {/* Claim History */}
                {claimHistory.length > 0 && (
                  <div className="bg-card rounded-lg p-6">
                    <h3 className="font-semibold mb-4 flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Claim History
                    </h3>
                    <div className="space-y-3">
                      {claimHistory.map((claim) => (
                        <div 
                          key={claim.id} 
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          data-testid={`claim-history-${claim.id}`}
                        >
                          <div className="flex-1">
                            <p className="font-medium">{claim.referralCount} referrals</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(claim.requestedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right mr-4">
                            <p className="font-bold text-green-500">${claim.amount}</p>
                          </div>
                          <div className="flex items-center">
                            {claim.status === 'pending' && (
                              <span className="flex items-center text-yellow-500 text-sm">
                                <Clock className="w-4 h-4 mr-1" />
                                Pending
                              </span>
                            )}
                            {claim.status === 'completed' && (
                              <span className="flex items-center text-green-500 text-sm">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Paid
                              </span>
                            )}
                            {claim.status === 'cancelled' && (
                              <span className="flex items-center text-red-500 text-sm">
                                <XCircle className="w-4 h-4 mr-1" />
                                Cancelled
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}