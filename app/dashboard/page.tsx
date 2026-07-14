"use client";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import WelcomeSection from "@/components/dashboard/WelcomeSection";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTaskNotifications } from "@/hooks/use-task-notifications";
import { useWebSocket, useTaskUpdates } from "@/contexts/WebSocketContext";
import { User, Crown, Award, BookOpen, Wifi, WifiOff, GraduationCap } from "lucide-react";
import SEO from "@/components/SEO";
import Link from "next/link";
import { User as UserType, Task, UserTask } from "@shared/schema";

// Define interfaces for type safety
interface TaskWithTask extends UserTask {
  task: Task;
}

interface DashboardData {
  user: UserType;
  taskCounts: { available: number; completed: number };
  pointsData: { total: number; daily: number };
  milestones: any[];
  recentTasks: TaskWithTask[];
  topEarners: UserType[];
}

function DashboardContent() {
  const { user } = useAuth();

  // Enable task notifications
  useTaskNotifications();
  
  // WebSocket integration for real-time updates
  const { isConnected } = useWebSocket();
  const { newTaskCount, recentCompletions, clearNewTaskCount } = useTaskUpdates();

  // Fetch dashboard data for recent tasks and top earners
  const { data: dashboardData, isLoading, error, refetch} = useQuery<DashboardData>({
    queryKey: ['/api/dashboard', { userId: user?.id }],
    enabled: !!user?.id,
    refetchInterval: isConnected ? 300000 : 60000, // 5 minutes if connected, 1 minute if not
    staleTime: isConnected ? 120000 : 30000, // 2 minutes if connected, 30 seconds if not
    refetchOnWindowFocus: false, // Prevent excessive refetching
    retry: 2, // Limit retry attempts
  });

  // Prepare top earners data
  const topEarners: UserType[] = dashboardData?.topEarners || [];

  // Prepare recent tasks data
  const recentTasks: TaskWithTask[] = dashboardData?.recentTasks || [];

  return (
    <div className="min-h-screen bg-background flex">
      <SEO
        title="Dashboard - 4LO4LO"
        description="View your tasks, points, and activity on 4LO4LO. Complete social media tasks, watch Classroom videos, refer friends, and earn real cash rewards."
      />
      <Sidebar />
      <div className="flex-1 pb-20 md:pb-0">
        <main className="container mx-auto px-4 py-8">
          <WelcomeSection />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {/* Recent Tasks */}
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Tasks</h2>
                <Link href="/tasks">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>

              {recentTasks.length > 0 ? (
                <div className="space-y-4">
                  {recentTasks.slice(0, 3).map((task, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{task.task.title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(task.completedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium">+{task.task.points} pts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  No recent tasks found. Start completing tasks to see them here!
                </div>
              )}
            </div>

            {/* Top Earners */}
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Top Earners</h2>
                <Link href="/rewards">
                  <Button variant="outline" size="sm">View Rewards</Button>
                </Link>
              </div>

              {topEarners.length > 0 ? (
                <div className="space-y-4">
                  {topEarners.slice(0, 5).map((earner, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          {index === 0 ? (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <User className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <span className="text-sm">{earner.username}</span>
                      </div>
                      <span className="font-medium text-sm">{earner.points} pts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  No top earners data available.
                </div>
              )}
            </div>

            {/* How It Works */}
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">How It Works</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Complete Tasks</p>
                    <p className="text-xs text-muted-foreground">Engage with social platforms to earn points</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Watch & Learn</p>
                    <p className="text-xs text-muted-foreground">Earn bonus points from Classroom videos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Invite Friends</p>
                    <p className="text-xs text-muted-foreground">Earn cash rewards for every referral</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-semibold">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Cash Out</p>
                    <p className="text-xs text-muted-foreground">Convert points into real money</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Link href="/tasks">
                    <Button className="w-full">Start Completing Tasks</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Classroom Discovery Banner */}
          <div className="mt-6 bg-gradient-to-r from-purple-500/10 via-primary/10 to-pink-500/10 border border-primary/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base">Educate Yourself and Earn More!</h3>
                <p className="text-sm text-muted-foreground">
                  The 4LO4LO Classroom has free video lessons to help you grow as a creator. Watch, learn, and earn bonus points.
                </p>
              </div>
            </div>
            <Link href="/classroom">
              <Button className="w-full sm:w-auto flex-shrink-0 gap-2">
                <GraduationCap className="w-4 h-4" />
                Go to Classroom
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}



﻿import { ProtectedRoute } from "@/lib/protected-route";
export default function Page() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

