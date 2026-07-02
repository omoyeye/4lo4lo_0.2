import { Award, Star, CheckCircle, BarChart, Flame, Gift } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import LevelUpCelebration from "./LevelUpCelebration";

export default function WelcomeSection() {
  const { user } = useAuth();
  const [level, setLevel] = useState(user?.level || 1);
  const [progress, setProgress] = useState(user?.progress || 0);
  const [celebrationLevel, setCelebrationLevel] = useState<number | null>(null);
  const prevLevelRef = useRef<number | null>(null);

  // Fetch dashboard data
  const { data: dashboardData } = useQuery<any>({
    queryKey: ['/api/dashboard', { userId: user?.id }],
    enabled: !!user?.id,
    refetchInterval: 2000, // Refetch every 2 seconds
    refetchOnWindowFocus: true // Refetch when window regains focus
  });

  useEffect(() => {
    if (dashboardData?.user) {
      const newLevel = dashboardData.user.level || 1;
      const newProgress = dashboardData.user.progress || 0;

      if (prevLevelRef.current !== null && newLevel > prevLevelRef.current) {
        setCelebrationLevel(newLevel);
      }

      prevLevelRef.current = newLevel;
      setLevel(newLevel);
      setProgress(newProgress);
    }
  }, [dashboardData]);

  const streakCount = (dashboardData?.user?.streakCount ?? user?.streakCount) || 0;

  // Fetch streak milestone settings to display next reward
  const { data: streakSettings } = useQuery<{ milestones: Array<{ streak: number; bonusPoints: number }> }>({
    queryKey: ["/api/streak-settings"],
  });

  const nextMilestone = streakSettings?.milestones
    ?.filter(m => m.streak > streakCount)
    .sort((a, b) => a.streak - b.streak)[0] ?? null;

  const streakSubtext = nextMilestone
    ? `${nextMilestone.streak - streakCount} day${nextMilestone.streak - streakCount === 1 ? "" : "s"} to +${nextMilestone.bonusPoints} pts`
    : streakCount >= 7 ? "On fire! 🔥" : streakCount >= 3 ? "Keep it up!" : "Log in daily";

  const stats = [
    {
      title: "Available Tasks",
      value: dashboardData?.taskCounts?.available || 0,
      icon: <CheckCircle className="text-green-500" />,
      change: "Updated daily"
    },
    {
      title: "Completed Tasks",
      value: dashboardData?.taskCounts?.completed || 0,
      icon: <CheckCircle className="text-blue-500" />,
      change: "Keep going!"
    },
    {
      title: "Total Points",
      value: dashboardData?.pointsData?.total || user?.points || 0,
      icon: <Star className="text-yellow-500" />,
      change: "Earn more"
    },
    {
      title: "Login Streak",
      value: streakCount === 1 ? "1 day" : `${streakCount} days`,
      icon: <Flame className={streakCount >= 3 ? "text-orange-500" : "text-muted-foreground"} />,
      change: streakSubtext
    }
  ];

  return (
    <>
      {celebrationLevel !== null && (
        <LevelUpCelebration
          newLevel={celebrationLevel}
          onClose={() => setCelebrationLevel(null)}
        />
      )}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8 pt-[50px] pb-[50px]">
      <h1 className="text-2xl font-bold mb-2">Welcome to 4LO4LO!</h1>
      <p className="text-muted-foreground max-w-3xl">
        Earn points by completing social media tasks on YouTube, TikTok, Facebook, and Instagram. Learn from the Classroom, refer friends, and convert your points into real cash rewards.
      </p>
      {/* Level Progress Bar */}
      <div className="mt-6 bg-card rounded-xl p-4 border shadow-sm">
        <div className="flex items-center justify-between mb-2">
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
            <span className="text-sm font-bold" style={{ color: progress >= 70 ? "#f59e0b" : progress >= 35 ? "#a855f7" : "hsl(var(--primary))" }}>
              {progress}%
            </span>
            <p className="text-xs text-muted-foreground">
              {Math.round(progress * 10)} / 1000 pts
            </p>
          </div>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background:
                progress >= 70
                  ? "linear-gradient(90deg, #a855f7, #f59e0b)"
                  : progress >= 35
                  ? "linear-gradient(90deg, hsl(var(--primary)), #a855f7)"
                  : "hsl(var(--primary))",
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {1000 - Math.round(progress * 10)} more points to reach Level {level + 1}
        </p>
      </div>
      {/* Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8" data-tutorial="dashboard-stats">
        {stats.map((stat, index) => (
          <div key={index} className="bg-card rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </div>
              <div className="p-2 bg-background rounded-full">
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
    </>
  );
}