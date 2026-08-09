"use client";
import { isValidSection, DEFAULT_SECTION } from "@/components/admin/AdminNav";
import { useState, useMemo, useEffect, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { RealtimeMetrics, MetricCard, ProgressChart, CircularProgress } from "@/components/charts/AdvancedCharts";
import { DashboardCardSkeleton, TableSkeleton, ChartSkeleton, LoadingSpinner } from "@/components/ui/loading-states";
import {
  Users,
  Award,
  Settings,
  Shield,
  Activity,
  Bell,
  Database,
  Key,
  Lock,
  BarChart,
  FileText,
  UserCog,
  CheckCircle,
  XCircle,
  Plus,
  Trash,
  Edit,
  Save,
  RefreshCcw,
  LogOut,
  Rocket,
  DollarSign,
  Eye,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Mail,
  Star,
  Flame
} from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Task, User } from "@shared/schema.mysql";

// System status interface
interface SystemStatus {
  database: {
    connected: boolean;
    status: string;
    lastChecked: string;
    error?: string;
  };
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  application: {
    users: number;
    tasks: number;
    completedTasks: number;
    taskCompletionRate: string;
  };
  server: {
    uptime: number;
    timestamp: string;
  };
  healthStatus: string;
}
import { Skeleton } from "@/components/ui/skeleton"; 
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import PaymentRequests from "@/components/admin/PaymentRequests";
import { Switch } from "@/components/ui/switch";
import { Megaphone, GraduationCap, Trophy, Link } from "lucide-react";
import AdminNotificationBell from "@/components/AdminNotificationBell";
import EmailCenter from "@/components/admin/EmailCenter";
import ClassroomManager from "@/components/admin/ClassroomManager";
import BadgeManager from "@/components/admin/BadgeManager";
import StreakSettingsManager from "@/components/admin/StreakSettingsManager";
import ReferralTierManager from "@/components/admin/ReferralTierManager";
import { Store, ChevronDown as ChevDown, ChevronUp as ChevUp } from "lucide-react";

import { AdminMarketplacePanel } from "@/components/admin/panels/MarketplacePanel";
import { AdminAdsPanel } from "@/components/admin/panels/AdsPanel";
import {
  PromoteMeToggle,
  ClassroomToggle,
  MarketplaceSettingsPanel,
  LeaderboardSettingsPanel,
  RewardsSettingsPanel,
} from "@/components/admin/panels/FeatureSettingsPanels";
import { AdminManagementPanel } from "@/components/admin/panels/AdminManagementPanel";

function AdminDashboardContent() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setLocation = (p: string) => router.push(p);

  // The active section is URL state, not component state, so admin views are
  // linkable, survive a refresh, and behave correctly under the back button.
  // AdminShell reads the same parameter to highlight the matching nav item.
  const rawSection = searchParams.get("section");
  const selectedTab = isValidSection(rawSection)
    ? (rawSection as string)
    : DEFAULT_SECTION;
  const setSelectedTab = (id: string) =>
    router.push(`${pathname}?section=${id}`, { scroll: false });
  const [searchTerm, setSearchTerm] = useState("");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [awardPointsOpen, setAwardPointsOpen] = useState(false);
  const [awardPointsAmount, setAwardPointsAmount] = useState("");
  const [statsExpanded, setStatsExpanded] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    platform: "facebook",
    type: "like",
    points: 50,
    taskUrl: "",
    maxCompletions: null as number | null,
    isActive: true,
    scheduledPublishAt: null as string | null,
  });
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "member"
  });
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [newPlan, setNewPlan] = useState({
    name: "",
    description: "",
    platform: "facebook",
    engagementCount: 0,
    price: 0,
    features: "",
    duration: 30,
    isActive: true
  });

  // Fetch admin stats with analytics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch system status information
  const { data: systemStatus, isLoading: systemStatusLoading } = useQuery<SystemStatus>({
    queryKey: ["systemStatus"],
    queryFn: async () => {
      try {
        // Get database connection status
        const dbRes = await fetch("/api/admin/system/db-status", {
          credentials: 'include'
        });
        const dbStatus = await dbRes.json();

        // Get app metrics
        const metricsRes = await fetch("/api/admin/system/metrics", {
          credentials: 'include'
        });
        const metrics = await metricsRes.json();

        return {
          database: dbStatus,
          memory: metrics.memory || { rss: 0, heapTotal: 0, heapUsed: 0 },
          application: metrics.application || { 
            users: 0, 
            tasks: 0, 
            completedTasks: 0, 
            taskCompletionRate: "0" 
          },
          server: {
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString()
          },
          healthStatus: dbStatus.connected ? "healthy" : "error"
        } as SystemStatus;
      } catch (error) {
        console.error("Error fetching system status:", error);
        return {
          database: { 
            connected: false, 
            status: "error",
            lastChecked: new Date().toISOString()
          },
          memory: { rss: 0, heapTotal: 0, heapUsed: 0 },
          application: { users: 0, tasks: 0, completedTasks: 0, taskCompletionRate: "0" },
          server: { uptime: 0, timestamp: new Date().toISOString() },
          healthStatus: "error"
        } as SystemStatus;
      }
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch task click analytics
  const { data: taskClickAnalytics, isLoading: taskClicksLoading } = useQuery({
    queryKey: ["taskClickAnalytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/task-clicks", {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch task click analytics");
      return res.json();
    },
    refetchInterval: 120000 // Refresh every 2 minutes
  });

  // Fetch promotion plans
  const { data: promotionPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["promotionPlans"],
    queryFn: async () => {
      const res = await fetch("/api/promotion/plans");
      if (!res.ok) throw new Error("Failed to fetch promotion plans");
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch promotion requests
  const { data: promotionRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["promotionRequests"],
    queryFn: async () => {
      const res = await fetch("/api/promotion/requests");
      if (!res.ok) throw new Error("Failed to fetch promotion requests");
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch detailed request information when a request is selected
  const { data: requestDetails, isLoading: requestDetailsLoading } = useQuery({
    queryKey: ["requestDetails", selectedRequestId],
    queryFn: async () => {
      if (!selectedRequestId) return null;
      const res = await fetch(`/api/admin/promotion-request/${selectedRequestId}`);
      if (!res.ok) throw new Error("Failed to fetch request details");
      return res.json();
    },
    enabled: !!selectedRequestId
  });

  // Process analytics data for charts
  const analyticsData = useMemo(() => {
    if (!stats?.analytics) return null;

    return {
      userGrowth: Object.entries(stats.analytics.userGrowth).map(([date, count]) => ({
        date,
        count
      })).sort((a, b) => a.date.localeCompare(b.date)),

      taskCompletions: stats.analytics.taskCompletionRate.map((task: any) => ({
        task: task.title,
        completions: task.completions
      })),

      platformDistribution: Object.entries(stats.analytics.topPlatforms).map(([platform, count]) => ({
        platform,
        count
      }))
    };
  }, [stats]);

  // Fetch tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["adminTasks"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tasks", {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: number, updates: Partial<Task> }) => {
      const response = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTasks"] });
      toast({
        title: "Task Updated",
        description: "Task has been successfully updated"
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update task",
        variant: "destructive"
      });
    }
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: { 
      title: string; 
      description: string; 
      platform: string; 
      type: string; 
      points: number; 
      taskUrl: string; 
      maxCompletions: number | null;
      isActive: boolean;
      scheduledPublishAt: string | null;
    }) => {
      const now = new Date();
      const response = await fetch("/api/admin/tasks", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...taskData, 
          createdBy: users?.[0]?.id || 1,
          createdAt: now,
          expiresAt: null
        })
      });

      if (!response.ok) throw new Error('Failed to create task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTasks"] });
      setNewTaskOpen(false);
      setNewTask({
        title: "",
        description: "",
        platform: "facebook",
        type: "like",
        points: 50,
        taskUrl: "",
        maxCompletions: null,
        isActive: true,
        scheduledPublishAt: null,
      });
      toast({
        title: "Task Created",
        description: "New task has been successfully created"
      });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create new task",
        variant: "destructive"
      });
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTasks"] });
      toast({
        title: "Task Deleted",
        description: "Task has been successfully deleted"
      });
    },
    onError: () => {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete task",
        variant: "destructive"
      });
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: { username: string; email: string; password: string; role: string }) => {
      const response = await fetch("/api/admin/users", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!response.ok) throw new Error('Failed to create user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      setNewUserOpen(false);
      setNewUser({ username: "", email: "", password: "", role: "member" });
      toast({
        title: "User Created",
        description: "New user has been successfully created"
      });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create new user",
        variant: "destructive"
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast({
        title: "User Deleted",
        description: "User has been successfully deleted"
      });
    },
    onError: () => {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number, role: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });

      if (!response.ok) throw new Error('Failed to update user role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast({
        title: "Role Updated",
        description: "User role has been successfully updated"
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number, password: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!response.ok) throw new Error('Failed to reset password');
      return response.json();
    },
    onSuccess: () => {
      setPasswordResetOpen(false);
      setNewPassword("");
      setSelectedUserId(null);
      toast({
        title: "Password Reset",
        description: "User password has been successfully reset"
      });
    },
    onError: () => {
      toast({
        title: "Reset Failed",
        description: "Failed to reset user password",
        variant: "destructive"
      });
    }
  });

  // Award bonus points mutation
  const awardPointsMutation = useMutation({
    mutationFn: async ({ userId, points }: { userId: number; points: number }) => {
      const response = await fetch(`/api/admin/users/${userId}/points`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points })
      });
      if (!response.ok) throw new Error('Failed to award points');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      setAwardPointsOpen(false);
      setAwardPointsAmount("");
      setSelectedUserId(null);
      toast({
        title: "Points Awarded",
        description: "Bonus points have been awarded to the user"
      });
    },
    onError: () => {
      toast({
        title: "Award Failed",
        description: "Failed to award points to user",
        variant: "destructive"
      });
    }
  });

  // Create promotion plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const response = await fetch("/api/promotion/plans", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData)
      });
      if (!response.ok) throw new Error('Failed to create promotion plan');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotionPlans"] });
      setNewPlanOpen(false);
      setNewPlan({ name: "", description: "", platform: "facebook", engagementCount: 0, price: 0, features: "", duration: 30, isActive: true });
      toast({
        title: "Plan Created",
        description: "Promotion plan has been successfully created"
      });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create promotion plan",
        variant: "destructive"
      });
    }
  });

  // Update promotion plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({ planId, updates }: { planId: number, updates: any }) => {
      const response = await fetch(`/api/promotion/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update promotion plan');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotionPlans"] });
      setEditPlanOpen(false);
      setSelectedPlan(null);
      toast({
        title: "Plan Updated",
        description: "Promotion plan has been successfully updated"
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update promotion plan",
        variant: "destructive"
      });
    }
  });

  // Delete promotion plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      const response = await fetch(`/api/promotion/plans/${planId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete promotion plan');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotionPlans"] });
      toast({
        title: "Plan Deleted",
        description: "Promotion plan has been successfully deleted"
      });
    },
    onError: () => {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete promotion plan",
        variant: "destructive"
      });
    }
  });

  // Update promotion request status mutation
  const updateRequestStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number, status: string }) => {
      const response = await fetch(`/api/promotion/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update request status' }));
        throw new Error(error.message || 'Failed to update request status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotionRequests"] });
      toast({
        title: "Status Updated",
        description: "Request status has been successfully updated"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update request status",
        variant: "destructive"
      });
    }
  });

  // Delete promotion request mutation
  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/promotion/requests/${requestId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete request' }));
        throw new Error(error.message || 'Failed to delete request');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotionRequests"] });
      toast({
        title: "Request Deleted",
        description: "Promotion request has been successfully deleted"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete request",
        variant: "destructive"
      });
    }
  });

  // Filter users based on search term
  const filteredUsers = users ? users.filter((user: User) => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Filter tasks based on search term
  const filteredTasks = tasks ? tasks.filter((task: Task) => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.platform.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Logout now lives in AdminShell (components/admin/AdminShell.tsx) alongside
  // the rest of the admin chrome, so it is not duplicated per page.

  return (
    <div className="p-4 sm:p-6">

          {/* Enhanced Stats Overview */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Overview Statistics
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatsExpanded(!statsExpanded)}
                className="gap-2"
              >
                {statsExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Expand
                  </>
                )}
              </Button>
            </div>
            
            <motion.div
              initial={false}
              animate={{
                height: statsExpanded ? "auto" : 0,
                opacity: statsExpanded ? 1 : 0
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              {statsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <DashboardCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <RealtimeMetrics metrics={stats} />
              )}
            </motion.div>
          </div>

          {/* Main Content Tabs */}
          {/* Section content. Navigation lives in components/admin/AdminShell.tsx —
              the TabsList that used to sit here was the second, competing nav. */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>

            {/* Sections promoted out of System Settings so they have real nav
                entries instead of being buried in a scroll. */}
            <TabsContent value="admins" className="space-y-4">
              <AdminManagementPanel />
            </TabsContent>

            <TabsContent value="referralTiers" className="space-y-4">
              <ReferralTierManager />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <Button onClick={() => setNewUserOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create User
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Input 
                      placeholder="Search users..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button 
                      variant="outline"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ["adminUsers"] })}
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                  </div>

                  {usersLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((n) => (
                        <Skeleton key={n} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user: User) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.id}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Select
                                defaultValue={user.role || "member"}
                                onValueChange={(value) => {
                                  updateUserRoleMutation.mutate({
                                    userId: user.id,
                                    role: value
                                  });
                                }}
                              >
                                <SelectTrigger className="w-[100px]">
                                  <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>{user.points}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="Award Bonus Points"
                                  onClick={() => {
                                    setSelectedUserId(user.id);
                                    setAwardPointsAmount("");
                                    setAwardPointsOpen(true);
                                  }}
                                >
                                  <Award className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUserId(user.id);
                                    setPasswordResetOpen(true);
                                  }}
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete user ${user.username}?`)) {
                                      deleteUserMutation.mutate(user.id);
                                    }
                                  }}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Task Management</CardTitle>
                  <Button onClick={() => setNewTaskOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Input 
                      placeholder="Search tasks..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {tasksLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((n) => (
                        <Skeleton key={n} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredTasks.map((task: Task) => (
                        <div key={task.id} className="p-4 border rounded-lg shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div className="space-y-1">
                              <input
                                className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none w-full"
                                defaultValue={task.title}
                                onBlur={(e) => updateTaskMutation.mutate({
                                  taskId: task.id,
                                  updates: { title: e.target.value }
                                })}
                              />
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="capitalize">
                                  {task.platform}
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                  {task.type}
                                </Badge>
                                <Badge className="bg-primary/10 text-primary">
                                  {task.points} points
                                </Badge>
                                {task.scheduledPublishAt && !task.isActive && (
                                  <Badge className="bg-orange-500/10 text-orange-600 border border-orange-500/20">
                                    Scheduled: {new Date(task.scheduledPublishAt).toLocaleString()}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => updateTaskMutation.mutate({
                                  taskId: task.id,
                                  updates: { isActive: !task.isActive }
                                })}
                              >
                                {task.isActive ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="icon"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this task?")) {
                                    deleteTaskMutation.mutate(task.id);
                                  }
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm text-muted-foreground">
                                  Description
                                </label>
                                <Textarea
                                  className="mt-1"
                                  value={task.description}
                                  onChange={(e) => updateTaskMutation.mutate({
                                    taskId: task.id,
                                    updates: { description: e.target.value }
                                  })}
                                />
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">
                                  Task URL
                                </label>
                                <Input
                                  className="mt-1"
                                  value={task.taskUrl}
                                  onChange={(e) => updateTaskMutation.mutate({
                                    taskId: task.id,
                                    updates: { taskUrl: e.target.value }
                                  })}
                                />

                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  <div>
                                    <label className="text-sm text-muted-foreground">
                                      Platform
                                    </label>
                                    <Select
                                      value={task.platform}
                                      onValueChange={(value) => updateTaskMutation.mutate({
                                        taskId: task.id,
                                        updates: { platform: value }
                                      })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Platform" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="facebook">Facebook</SelectItem>
                                        <SelectItem value="instagram">Instagram</SelectItem>
                                        <SelectItem value="tiktok">TikTok</SelectItem>
                                        <SelectItem value="youtube">YouTube</SelectItem>
                                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                        <SelectItem value="telegram">Telegram</SelectItem>
                                        <SelectItem value="twitter">Twitter/X</SelectItem>
                                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                                        <SelectItem value="snapchat">Snapchat</SelectItem>
                                        <SelectItem value="pinterest">Pinterest</SelectItem>
                                        <SelectItem value="discord">Discord</SelectItem>
                                        <SelectItem value="threads">Threads</SelectItem>
                                        <SelectItem value="google_review">Google Review</SelectItem>
                                        <SelectItem value="survey">Survey</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <label className="text-sm text-muted-foreground">
                                      Type
                                    </label>
                                    <Select
                                      value={task.type}
                                      onValueChange={(value) => updateTaskMutation.mutate({
                                        taskId: task.id,
                                        updates: { type: value }
                                      })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="follow">Follow</SelectItem>
                                        <SelectItem value="like">Like</SelectItem>
                                        <SelectItem value="comment">Comment</SelectItem>
                                        <SelectItem value="share">Share</SelectItem>
                                        <SelectItem value="view">View</SelectItem>
                                        <SelectItem value="subscribe">Subscribe</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t">
                              <label className="text-sm text-muted-foreground">Schedule Publish Date</label>
                              <div className="flex items-center gap-2 mt-1">
                                <Input
                                  type="datetime-local"
                                  className="flex-1"
                                  defaultValue={task.scheduledPublishAt ? new Date(task.scheduledPublishAt).toISOString().slice(0, 16) : ""}
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    updateTaskMutation.mutate({
                                      taskId: task.id,
                                      updates: { scheduledPublishAt: val ? new Date(val) : null } as Partial<Task>,
                                    });
                                  }}
                                />
                                {task.scheduledPublishAt && !task.isActive && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateTaskMutation.mutate({
                                      taskId: task.id,
                                      updates: { scheduledPublishAt: null } as Partial<Task>,
                                    })}
                                    disabled={updateTaskMutation.isPending}
                                  >
                                    Publish Now
                                  </Button>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Set a date to auto-publish, or clear and click "Publish Now" to go live immediately.
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Create new task dialog */}
              <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>
                      Fill in the details to create a new social media task.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        value={newTask.title}
                        onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                        placeholder="Like our Facebook page"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={newTask.description}
                        onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                        placeholder="Go to our Facebook page and click the Like button"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Platform</label>
                        <Select
                          value={newTask.platform}
                          onValueChange={(value) => setNewTask({...newTask, platform: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Platform" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="facebook">Facebook</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="telegram">Telegram</SelectItem>
                            <SelectItem value="twitter">Twitter/X</SelectItem>
                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                            <SelectItem value="snapchat">Snapchat</SelectItem>
                            <SelectItem value="pinterest">Pinterest</SelectItem>
                            <SelectItem value="discord">Discord</SelectItem>
                            <SelectItem value="threads">Threads</SelectItem>
                            <SelectItem value="google_review">Google Review</SelectItem>
                            <SelectItem value="survey">Survey</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Type</label>
                        <Select
                          value={newTask.type}
                          onValueChange={(value) => setNewTask({...newTask, type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="follow">Follow</SelectItem>
                            <SelectItem value="like">Like</SelectItem>
                            <SelectItem value="comment">Comment</SelectItem>
                            <SelectItem value="share">Share</SelectItem>
                            <SelectItem value="view">View</SelectItem>
                            <SelectItem value="subscribe">Subscribe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Task URL</label>
                      <Input
                        value={newTask.taskUrl}
                        onChange={(e) => setNewTask({...newTask, taskUrl: e.target.value})}
                        placeholder="https://facebook.com/ourpage"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Points</label>
                        <Input
                          type="number"
                          value={newTask.points}
                          onChange={(e) => setNewTask({...newTask, points: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Max Completions</label>
                        <Input
                          type="number"
                          value={newTask.maxCompletions || ""}
                          onChange={(e) => setNewTask({...newTask, maxCompletions: e.target.value ? parseInt(e.target.value) : null})}
                          placeholder="Unlimited (leave empty)"
                        />
                        <p className="text-xs text-muted-foreground">Limit how many users can complete this task</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Schedule Publish Date (optional)</label>
                      <Input
                        type="datetime-local"
                        value={newTask.scheduledPublishAt ? newTask.scheduledPublishAt.slice(0, 16) : ""}
                        onChange={(e) => setNewTask({...newTask, scheduledPublishAt: e.target.value ? new Date(e.target.value).toISOString() : null})}
                      />
                      <p className="text-xs text-muted-foreground">If set, task will be inactive until this date/time. Leave blank to publish immediately.</p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewTaskOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => createTaskMutation.mutate(newTask)}
                      disabled={createTaskMutation.isPending}
                    >
                      {createTaskMutation.isPending ? (
                        <>
                          <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Task"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="promotions" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Promotion Plans</CardTitle>
                  <Button onClick={() => setNewPlanOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Plan
                  </Button>
                </CardHeader>
                <CardContent>
                  {plansLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((n) => (
                        <Skeleton key={n} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : promotionPlans?.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No promotion plans found.</p>
                      <Button 
                        className="mt-4" 
                        onClick={() => setLocation("/admin/promotion-plans")}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Plan
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Engagement Count</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {promotionPlans?.map((plan: any) => (
                            <TableRow key={plan.id}>
                              <TableCell>{plan.id}</TableCell>
                              <TableCell>{plan.name}</TableCell>
                              <TableCell>{plan.engagementCount}</TableCell>
                              <TableCell>${parseFloat(plan.price).toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant={plan.isActive ? "default" : "secondary"}>
                                  {plan.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPlan(plan);
                                      setEditPlanOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete plan "${plan.name}"?`)) {
                                        deletePlanMutation.mutate(plan.id);
                                      }
                                    }}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Promotion Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {requestsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((n) => (
                        <Skeleton key={n} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : promotionRequests?.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No promotion requests found.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Requested</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {promotionRequests?.map((request: any) => (
                            <TableRow key={request.id}>
                              <TableCell>{request.id}</TableCell>
                              <TableCell>{request.userId}</TableCell>
                              <TableCell className="capitalize">{request.platform}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  request.status === "pending" ? "outline" : 
                                  request.status === "in_progress" ? "default" :
                                  request.status === "completed" ? "secondary" : "destructive"
                                }>
                                  {request.status === "in_progress" ? "In Progress" : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(request.requestedAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  {request.status === "pending" && (
                                    <>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => updateRequestStatusMutation.mutate({ requestId: request.id, status: "in_progress" })}
                                        disabled={updateRequestStatusMutation.isPending}
                                        data-testid={`button-approve-request-${request.id}`}
                                        title="Approve and start processing"
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={() => updateRequestStatusMutation.mutate({ requestId: request.id, status: "cancelled" })}
                                        disabled={updateRequestStatusMutation.isPending}
                                        data-testid={`button-reject-request-${request.id}`}
                                        title="Reject and cancel"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  {request.status === "in_progress" && (
                                    <Button 
                                      variant="secondary" 
                                      size="sm"
                                      onClick={() => updateRequestStatusMutation.mutate({ requestId: request.id, status: "completed" })}
                                      disabled={updateRequestStatusMutation.isPending}
                                      data-testid={`button-complete-request-${request.id}`}
                                      title="Mark as completed"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRequestId(request.id);
                                      setRequestDetailsOpen(true);
                                    }}
                                    data-testid={`button-view-request-${request.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this promotion request?')) {
                                        deleteRequestMutation.mutate(request.id);
                                      }
                                    }}
                                    disabled={deleteRequestMutation.isPending}
                                    data-testid={`button-delete-request-${request.id}`}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {/* Task Click Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Task Click Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <h3 className="font-medium mb-3">User Engagement Metrics</h3>

                    {taskClicksLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((n) => (
                          <Skeleton key={n} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : (
                      <div>
                        {taskClickAnalytics && taskClickAnalytics.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Task</TableHead>
                                <TableHead>Platform</TableHead>
                                <TableHead>Total Clicks</TableHead>
                                <TableHead>Unique Users</TableHead>
                                <TableHead>Conversion Rate</TableHead>
                                <TableHead>Details</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {taskClickAnalytics.map((item: any) => (
                                <TableRow key={item.taskId}>
                                  <TableCell>{item.title}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{item.platform}</Badge>
                                  </TableCell>
                                  <TableCell>{item.totalClicks}</TableCell>
                                  <TableCell>{item.uniqueUsers}</TableCell>
                                  <TableCell>{item.conversionRate}%</TableCell>
                                  <TableCell>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <BarChart className="h-4 w-4 mr-1" />
                                          Details
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-3xl">
                                        <DialogHeader>
                                          <DialogTitle>{item.title} - Click Details</DialogTitle>
                                          <DialogDescription>
                                            Detailed analytics and metrics for this task
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="mt-4 space-y-4">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <h3 className="font-medium">Task Click Metrics</h3>
                                              <p className="text-sm text-muted-foreground">
                                                Platform: {item.platform}
                                              </p>
                                            </div>
                                            <div className="text-right">
                                              <p className="text-lg font-bold">{item.totalClicks}</p>
                                              <p className="text-sm text-muted-foreground">Total Clicks</p>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Card>
                                              <CardContent className="pt-6">
                                                <div className="text-center">
                                                  <p className="text-2xl font-bold">{item.uniqueUsers}</p>
                                                  <p className="text-sm text-muted-foreground">Unique Users</p>
                                                </div>
                                              </CardContent>
                                            </Card>
                                            <Card>
                                              <CardContent className="pt-6">
                                                <div className="text-center">
                                                  <p className="text-2xl font-bold">{item.conversionRate}%</p>
                                                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                                                </div>
                                              </CardContent>
                                            </Card>
                                            <Card>
                                              <CardContent className="pt-6">
                                                <div className="text-center">
                                                  <p className="text-2xl font-bold">
                                                    {Math.round((item.totalClicks / (stats?.totalCompletions || 1)) * 100)}%
                                                  </p>
                                                  <p className="text-sm text-muted-foreground">Of Total Activity</p>
                                                </div>
                                              </CardContent>
                                            </Card>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="p-4 bg-muted rounded-md text-center">
                            <p>No task click data available yet</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Data will appear once users start clicking on tasks
                            </p>
                          </div>
                        )}

                        <div className="mt-4 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              queryClient.invalidateQueries({ queryKey: ["taskClickAnalytics"] });
                              toast({
                                title: "Refreshed",
                                description: "Task click analytics have been refreshed"
                              });
                            }}
                          >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Refresh Analytics
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="systemAnalytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="users">Users</TabsTrigger>
                      <TabsTrigger value="tasks">Tasks</TabsTrigger>
                      <TabsTrigger value="performance">Performance</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>User Growth</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {systemStatusLoading ? (
                              <Skeleton className="h-40 w-full" />
                            ) : (
                              <div className="text-center p-4">
                                <h3 className="text-2xl font-bold">{systemStatus?.application?.users || 0}</h3>
                                <p className="text-sm text-muted-foreground">Total Users</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle>Task Completion Rate</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {systemStatusLoading ? (
                              <Skeleton className="h-40 w-full" />
                            ) : (
                              <div className="text-center p-4">
                                <h3 className="text-2xl font-bold">{systemStatus?.application?.taskCompletionRate || 0}</h3>
                                <p className="text-sm text-muted-foreground">Completion Ratio</p>
                                <div className="mt-2 text-sm">
                                  <span>{systemStatus?.application?.completedTasks || 0}</span>
                                  <span className="mx-1">/</span>
                                  <span>{systemStatus?.application?.tasks || 0}</span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                    <TabsContent value="users" className="space-y-4 mt-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center p-4">
                            <h3 className="text-2xl font-bold">{systemStatus?.application?.users || 0}</h3>
                            <p className="text-sm text-muted-foreground">Total Registered Users</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="tasks" className="space-y-4 mt-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4">
                              <h3 className="text-2xl font-bold">{systemStatus?.application?.tasks || 0}</h3>
                              <p className="text-sm text-muted-foreground">Total Tasks</p>
                            </div>
                            <div className="text-center p-4">
                              <h3 className="text-2xl font-bold">{systemStatus?.application?.completedTasks || 0}</h3>
                              <p className="text-sm text-muted-foreground">Completed Tasks</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="performance" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Server Uptime</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {systemStatusLoading ? (
                              <Skeleton className="h-20 w-full" />
                            ) : (
                              <div className="text-center p-4">
                                <h3 className="text-xl font-bold">
                                  {Math.floor((systemStatus?.server?.uptime || 0) / 3600)}h {Math.floor(((systemStatus?.server?.uptime || 0) % 3600) / 60)}m
                                </h3>
                                <p className="text-sm text-muted-foreground">Running Time</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle>Database Status</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {systemStatusLoading ? (
                              <Skeleton className="h-20 w-full" />
                            ) : (
                              <div className="text-center p-4">
                                <div className="flex items-center justify-center mb-2">
                                  {systemStatus?.database?.connected ? (
                                    <CheckCircle className="h-8 w-8 text-green-500" />
                                  ) : (
                                    <XCircle className="h-8 w-8 text-red-500" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {systemStatus?.database?.connected ? "Connected" : "Disconnected"}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <div className="mt-6 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        queryClient.invalidateQueries({ queryKey: ["systemStatus"] });
                        toast({
                          title: "Refreshed",
                          description: "System analytics have been refreshed"
                        });
                      }}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Refresh Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <PaymentRequests />
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <EmailCenter />
            </TabsContent>

            <TabsContent value="classroom" className="space-y-4">
              <ClassroomManager />
            </TabsContent>

            <TabsContent value="badges" className="space-y-4">
              <BadgeManager />
            </TabsContent>

            <TabsContent value="streakSettings" className="space-y-4">
              <StreakSettingsManager />
            </TabsContent>

            <TabsContent value="marketplace" className="space-y-4">
              <AdminMarketplacePanel />
            </TabsContent>

            <TabsContent value="ads" className="space-y-4">
              <AdminAdsPanel />
            </TabsContent>

            <TabsContent value="system" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* System status summary */}
                  <div className="mb-6 p-4 border rounded-lg">
                    <h3 className="font-medium mb-3">System Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm text-muted-foreground">Database</span>
                        {systemStatusLoading ? (
                          <Skeleton className="h-6 w-20" />
                        ) : (
                          <div className="flex items-center">
                            {systemStatus?.database?.connected ? (
                              <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-1 text-red-500" />
                            )}
                            <span>{systemStatus?.database?.connected ? "Connected" : "Disconnected"}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col space-y-1">
                        <span className="text-sm text-muted-foreground">Server Uptime</span>
                        {systemStatusLoading ? (
                          <Skeleton className="h-6 w-20" />
                        ) : (
                          <span>{Math.floor((systemStatus?.server?.uptime || 0) / 3600)}h {Math.floor(((systemStatus?.server?.uptime || 0) % 3600) / 60)}m</span>
                        )}
                      </div>

                      <div className="flex flex-col space-y-1">
                        <span className="text-sm text-muted-foreground">Memory Usage</span>
                        {systemStatusLoading ? (
                          <Skeleton className="h-6 w-20" />
                        ) : (
                          <span>{systemStatus?.memory?.heapUsed || 0} MB / {systemStatus?.memory?.heapTotal || 0} MB</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-start justify-between bg-card p-4 rounded-lg border border-dashed">
                      <div>
                        <h3 className="font-medium flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          Database Backup
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Backups are not run from this panel. Use your database
                          provider&apos;s scheduled snapshots, or{" "}
                          <code className="text-xs">mysqldump</code> — see{" "}
                          <code className="text-xs">docs/OPERATIONS.md</code>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-card p-4 rounded-lg">
                      <div>
                        <h3 className="font-medium">Maintenance Mode</h3>
                        <p className="text-sm text-muted-foreground">
                          Take the application offline for maintenance
                        </p>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/admin/maintenance/toggle', {
                              method: 'POST'
                            });
                            if (response.ok) {
                              const { isEnabled } = await response.json();
                              toast({
                                title: isEnabled ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
                                description: isEnabled ? "System is now in maintenance mode" : "System is now online"
                              });

                              // Refresh system status
                              queryClient.invalidateQueries({ queryKey: ["systemStatus"] });
                            }
                          } catch (error) {
                            toast({
                              title: "Operation Failed",
                              description: "Failed to toggle maintenance mode",
                              variant: "destructive"
                            });
                          }
                        }}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Toggle
                      </Button>
                    </div>

                    <PromoteMeToggle />

                    <ClassroomToggle />

                    <MarketplaceSettingsPanel />

                    <LeaderboardSettingsPanel />

                    <RewardsSettingsPanel />

                    {/* AdminManagementPanel and ReferralTierManager moved to their
                        own sections (People > Admins, People > Referral Tiers) —
                        they were buried at the bottom of System Settings, and
                        referral tiers had no nav entry at all. */}

                    {/* Database Cleanup for Launch Preparation */}
                    {/* Destructive "Delete all data" control removed: it called
                        /api/admin/cleanup-database, which never existed, and this app runs
                        against a live production database. Bulk deletion belongs in a
                        reviewed SQL script, not a button. */}

                    {/* "Run Audit" and "Backup" buttons removed: /api/admin/security/audit
                        and /api/admin/backup returned a success toast without doing any
                        work, so the panel reported backups and audits that never happened.
                        Reinstate them only alongside real implementations. */}

                    {/* Real-time system refresh button */}
                    <div className="mt-6 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          queryClient.invalidateQueries({ queryKey: ["systemStatus"] });
                          toast({
                            title: "Refreshed",
                            description: "System status has been refreshed"
                          });
                        }}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Refresh System Status
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Create new user dialog */}
          <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new user account.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <Input
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    placeholder="john_doe"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    placeholder="Enter password"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({...newUser, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setNewUserOpen(false);
                    setNewUser({ username: "", email: "", password: "", role: "member" });
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => createUserMutation.mutate(newUser)}
                  disabled={!newUser.username || !newUser.email || !newUser.password}
                >
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Password reset dialog */}
          <Dialog open={passwordResetOpen} onOpenChange={setPasswordResetOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Enter a new password for the selected user.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setPasswordResetOpen(false);
                    setNewPassword("");
                    setSelectedUserId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedUserId && newPassword) {
                      resetPasswordMutation.mutate({ userId: selectedUserId, password: newPassword });
                    }
                  }}
                  disabled={!newPassword}
                >
                  Reset Password
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Award bonus points dialog */}
          <Dialog open={awardPointsOpen} onOpenChange={setAwardPointsOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Award Bonus Points</DialogTitle>
                <DialogDescription>
                  Enter the number of points to add to this user's balance. A positive number adds points; a negative number deducts points.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Points Amount</label>
                  <Input
                    type="number"
                    value={awardPointsAmount}
                    onChange={(e) => setAwardPointsAmount(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAwardPointsOpen(false);
                    setAwardPointsAmount("");
                    setSelectedUserId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const pts = parseInt(awardPointsAmount);
                    if (selectedUserId && !isNaN(pts) && pts !== 0) {
                      awardPointsMutation.mutate({ userId: selectedUserId, points: pts });
                    }
                  }}
                  disabled={!awardPointsAmount || isNaN(parseInt(awardPointsAmount)) || parseInt(awardPointsAmount) === 0 || awardPointsMutation.isPending}
                >
                  Award Points
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create promotion plan dialog */}
          <Dialog open={newPlanOpen} onOpenChange={setNewPlanOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Promotion Plan</DialogTitle>
                <DialogDescription>
                  Create a new promotion plan for users to purchase.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan Name</label>
                  <Input
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                    placeholder="Premium Plan"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                    placeholder="Advanced features and priority support"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform</label>
                  <Select
                    value={newPlan.platform}
                    onValueChange={(value) => setNewPlan({...newPlan, platform: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="snapchat">Snapchat</SelectItem>
                      <SelectItem value="pinterest">Pinterest</SelectItem>
                      <SelectItem value="discord">Discord</SelectItem>
                      <SelectItem value="threads">Threads</SelectItem>
                      <SelectItem value="google_review">Google Review</SelectItem>
                      <SelectItem value="survey">Survey</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Engagement Count</label>
                  <Input
                    type="number"
                    min="0"
                    value={newPlan.engagementCount || 0}
                    onChange={(e) => setNewPlan({...newPlan, engagementCount: parseInt(e.target.value) || 0})}
                    placeholder="10000"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newPlan.price}
                      onChange={(e) => setNewPlan({...newPlan, price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration (days)</label>
                    <Input
                      type="number"
                      value={newPlan.duration}
                      onChange={(e) => setNewPlan({...newPlan, duration: parseInt(e.target.value) || 30})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Features</label>
                  <Input
                    value={newPlan.features}
                    onChange={(e) => setNewPlan({...newPlan, features: e.target.value})}
                    placeholder="Feature 1, Feature 2, Feature 3"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newPlan.isActive}
                    onChange={(e) => setNewPlan({...newPlan, isActive: e.target.checked})}
                    className="rounded"
                  />
                  <label className="text-sm font-medium">Active Plan</label>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setNewPlanOpen(false);
                    setNewPlan({ name: "", description: "", platform: "facebook", engagementCount: 0, price: 0, features: "", duration: 30, isActive: true });
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => createPlanMutation.mutate(newPlan)}
                  disabled={!newPlan.name || !newPlan.description || createPlanMutation.isPending}
                >
                  {createPlanMutation.isPending ? "Creating..." : "Create Plan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit promotion plan dialog */}
          <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Promotion Plan</DialogTitle>
                <DialogDescription>
                  Update the promotion plan details.
                </DialogDescription>
              </DialogHeader>

              {selectedPlan && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Plan Name</label>
                    <Input
                      value={selectedPlan.name}
                      onChange={(e) => setSelectedPlan({...selectedPlan, name: e.target.value})}
                      placeholder="Premium Plan"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={selectedPlan.description || ""}
                      onChange={(e) => setSelectedPlan({...selectedPlan, description: e.target.value})}
                      placeholder="Advanced features and priority support"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Platform</label>
                    <Select
                      value={selectedPlan.platform || "facebook"}
                      onValueChange={(value) => setSelectedPlan({...selectedPlan, platform: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="telegram">Telegram</SelectItem>
                        <SelectItem value="twitter">Twitter/X</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="snapchat">Snapchat</SelectItem>
                        <SelectItem value="pinterest">Pinterest</SelectItem>
                        <SelectItem value="discord">Discord</SelectItem>
                        <SelectItem value="threads">Threads</SelectItem>
                        <SelectItem value="google_review">Google Review</SelectItem>
                        <SelectItem value="survey">Survey</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Engagement Count</label>
                    <Input
                      type="number"
                      min="0"
                      value={selectedPlan.engagementCount || 0}
                      onChange={(e) => setSelectedPlan({...selectedPlan, engagementCount: parseInt(e.target.value) || 0})}
                      placeholder="10000"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Price ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={parseFloat(selectedPlan.price) || 0}
                        onChange={(e) => setSelectedPlan({...selectedPlan, price: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Duration (days)</label>
                      <Input
                        type="number"
                        value={selectedPlan.duration || 30}
                        onChange={(e) => setSelectedPlan({...selectedPlan, duration: parseInt(e.target.value) || 30})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Features</label>
                    <Input
                      value={selectedPlan.features || ""}
                      onChange={(e) => setSelectedPlan({...selectedPlan, features: e.target.value})}
                      placeholder="Feature 1, Feature 2, Feature 3"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedPlan.isActive}
                      onChange={(e) => setSelectedPlan({...selectedPlan, isActive: e.target.checked})}
                      className="rounded"
                    />
                    <label className="text-sm font-medium">Active Plan</label>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditPlanOpen(false);
                    setSelectedPlan(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedPlan) {
                      updatePlanMutation.mutate({ planId: selectedPlan.id, updates: selectedPlan });
                    }
                  }}
                  disabled={!selectedPlan?.name || updatePlanMutation.isPending}
                >
                  {updatePlanMutation.isPending ? "Updating..." : "Update Plan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

      {/* Request Details Dialog */}
      <Dialog open={requestDetailsOpen} onOpenChange={setRequestDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Promotion Request Details</DialogTitle>
            <DialogDescription>
              Complete information about this promotion request
            </DialogDescription>
          </DialogHeader>
          
          {requestDetailsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : requestDetails ? (
            <div className="space-y-6">
              {/* User Information Section */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium">{requestDetails.user?.username || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{requestDetails.user?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-medium">#{requestDetails.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User Points</p>
                    <p className="font-medium">{requestDetails.user?.points || 0} pts</p>
                  </div>
                </div>
              </div>

              {/* Request Information Section */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Request Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Request ID</p>
                    <p className="font-medium">#{requestDetails.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={
                      requestDetails.status === "pending" ? "outline" : 
                      requestDetails.status === "in_progress" ? "default" :
                      requestDetails.status === "completed" ? "secondary" : "destructive"
                    }>
                      {requestDetails.status === "in_progress" ? "In Progress" : 
                       requestDetails.status.charAt(0).toUpperCase() + requestDetails.status.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Platform</p>
                    <p className="font-medium capitalize">{requestDetails.platform}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Engagement Type</p>
                    <p className="font-medium capitalize">{requestDetails.engagementType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Requested Date</p>
                    <p className="font-medium">
                      {new Date(requestDetails.requestedAt).toLocaleDateString()} at{' '}
                      {new Date(requestDetails.requestedAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {new Date(requestDetails.updatedAt).toLocaleDateString()} at{' '}
                      {new Date(requestDetails.updatedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Promotion Details Section */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Promotion Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Social Media URL</p>
                    <a 
                      href={requestDetails.socialMediaUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline break-all"
                    >
                      {requestDetails.socialMediaUrl}
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plan ID</p>
                    <p className="font-medium">#{requestDetails.planId}</p>
                  </div>
                  {requestDetails.customEngagementCount && (
                    <div>
                      <p className="text-sm text-muted-foreground">Custom Engagement Count</p>
                      <p className="font-medium">{requestDetails.customEngagementCount}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Information Section */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-medium text-lg">${requestDetails.price}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <Badge variant={requestDetails.paymentStatus === "paid" ? "secondary" : "outline"}>
                      {requestDetails.paymentStatus.charAt(0).toUpperCase() + requestDetails.paymentStatus.slice(1)}
                    </Badge>
                  </div>
                  {requestDetails.stripeSessionId && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Stripe Session ID</p>
                      <p className="font-mono text-sm break-all">{requestDetails.stripeSessionId}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Details Section */}
              {requestDetails.additionalDetails && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Additional Details</h3>
                  <p className="text-sm whitespace-pre-wrap">{requestDetails.additionalDetails}</p>
                </div>
              )}

              {/* Admin Notes Section */}
              {requestDetails.adminNotes && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Admin Notes</h3>
                  <p className="text-sm whitespace-pre-wrap">{requestDetails.adminNotes}</p>
                </div>
              )}

              {/* Completion Information */}
              {requestDetails.completedAt && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Completion Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed At</p>
                      <p className="font-medium">
                        {new Date(requestDetails.completedAt).toLocaleDateString()} at{' '}
                        {new Date(requestDetails.completedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No request details available</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



export default function Page() {
  // Auth guard and admin chrome are applied by app/admin/layout.tsx, so this
  // page only renders section content.
  return <AdminDashboardContent />;
}
