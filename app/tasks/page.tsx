"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Facebook, Youtube, Instagram, Twitter, Grid, List, MessageSquare, Linkedin, Heart, UserPlus, Eye, Share2, Star, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Footer from "@/components/layout/Footer";
import { SiTiktok, SiWhatsapp, SiTelegram, SiSnapchat, SiPinterest, SiDiscord, SiThreads, SiGoogle } from "react-icons/si";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Task } from "@shared/schema";
import TaskCard from "@/components/tasks/TaskCard";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useTaskNotifications } from "@/hooks/use-task-notifications";
import SEO from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { TaskCardSkeleton } from "@/components/ui/loading-states";
import { Skeleton } from "@/components/ui/skeleton";


function TasksContent() {
  const { user } = useAuth();

  // Enable task notifications
  useTaskNotifications();

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');


  // Fetch tasks
  const { data: tasks, isLoading, error, refetch } = useQuery<Task[]>({
    queryKey: ['/api/tasks', { userId: user?.id }],
    enabled: !!user // Only run query if user exists
  });

  // Fetch completed tasks
  const { data: completedTasks, isLoading: isLoadingCompleted } = useQuery<any[]>({
    queryKey: [`/api/tasks/completed/${user?.id}`],
    enabled: !!user && selectedStatus === 'completed'
  });

  // Known task types represented by dedicated chips; anything else falls under "other"
  const KNOWN_TASK_TYPES = new Set(['like', 'follow', 'comment', 'share', 'survey', 'view']);

  // Filter and sort tasks
  const filteredTasks = tasks ? tasks.filter(task => {
    const matchesPlatform = selectedPlatform 
      ? task.platform.toLowerCase() === selectedPlatform.toLowerCase() 
      : true;

    const matchesType = selectedType
      ? selectedType === 'other'
        ? !KNOWN_TASK_TYPES.has(task.type.toLowerCase())
        : task.type.toLowerCase() === selectedType.toLowerCase()
      : true;

    const matchesSearch = searchQuery
      ? task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    let matchesStatus = true;
    if (selectedStatus === 'available') {
      matchesStatus = task.isActive && !task.expiresAt;
    } else if (selectedStatus === 'in_progress') {
      matchesStatus = task.isActive && !!task.expiresAt;
    } else if (selectedStatus === 'completed') {
      matchesStatus = !task.isActive;
    }

    return matchesPlatform && matchesType && matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'most_points') return b.points - a.points;
    if (sortBy === 'least_points') return a.points - b.points;
    return b.id - a.id; // newest first (default)
  }) : [];

  const { toast } = useToast();

  // Task completion mutation
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, clickId }: { taskId: number; clickId?: number }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const payload: { userId: number; taskId: number; clickId?: number } = {
        userId: user.id,
        taskId,
      };

      if (clickId) {
        payload.clickId = clickId;
      }

      const response = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to complete task");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task completed!",
        description: "You've earned points for completing this task.",
      });

      // Refresh tasks list and dashboard data
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to complete task",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleTaskComplete = async (taskId: number, clickId?: number) => {
    completeTaskMutation.mutate({ taskId, clickId });
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      <SEO 
        title="Social Media Tasks - Complete Tasks and Earn Rewards" 
        description="Browse and complete social media tasks across YouTube, TikTok, Facebook, Instagram, and Twitter. Each completed task earns you points."
        keywords="social media tasks, earn points, YouTube tasks, TikTok tasks, Facebook tasks, Instagram tasks, Twitter tasks"
        url="/tasks"
      />
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0">
        <div className="flex-grow p-4 md:p-6 lg:p-8 content-container">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Tasks</h1>
            <p className="text-muted-foreground">Complete fun social challenges, boost your online presence, and earn awesome rewards! 🚀✨</p>
          </div>

          {/* Filters */}
          <div className="bg-card rounded-lg p-6 md:p-8 lg:p-10 mb-8 shadow-sm">
            <div className="flex flex-col space-y-6 mb-8">
              {/* Search + Sort row */}
              <div className="flex items-center gap-3 justify-between">
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 md:w-56"
                />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 h-9">
                    <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="most_points">Most Points</SelectItem>
                    <SelectItem value="least_points">Least Points</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={!selectedStatus ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedStatus(null);
                    refetch();
                  }}
                >
                  All Tasks
                </Button>

                <Button 
                  variant={selectedStatus === 'available' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus('available')}
                >
                  Available
                </Button>
                <Button 
                  variant={selectedStatus === 'in_progress' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus('in_progress')}
                >
                  In Progress
                </Button>
                <Button 
                  variant={selectedStatus === 'completed' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus('completed')}
                >
                  Completed
                </Button>
              </div>

              {/* Platform Filters */}
              <div className="flex flex-wrap gap-2 pb-2" data-tutorial="platform-filters">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlatform('facebook')}
                  className={`hover:bg-[#0B5FCC]/10 transition-colors flex items-center gap-2 ${selectedPlatform === 'facebook' ? 'bg-[#0B5FCC]/10 text-[#0B5FCC]' : ''}`}
                >
                  <Facebook className="w-4 h-4" />
                  <span>Facebook</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlatform('youtube')}
                  className={`hover:bg-[#CC0000]/10 transition-colors flex items-center gap-2 ${selectedPlatform === 'youtube' ? 'bg-[#CC0000]/10 text-[#CC0000]' : ''}`}
                >
                  <Youtube className="w-4 h-4" />
                  <span>YouTube</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlatform('tiktok')}
                  className={`hover:bg-[#111111]/10 transition-colors flex items-center gap-2 ${selectedPlatform === 'tiktok' ? 'bg-[#111111]/10 text-[#111111]' : ''}`}
                >
                  <SiTiktok className="w-4 h-4" />
                  <span>TikTok</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlatform('instagram')}
                  className={`hover:bg-[#B3103B]/10 transition-colors flex items-center gap-2 ${selectedPlatform === 'instagram' ? 'bg-[#B3103B]/10 text-[#B3103B]' : ''}`}
                >
                  <Instagram className="w-4 h-4" />
                  <span>Instagram</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlatform('twitter')}
                  className={`hover:bg-[#1DA1F2]/10 transition-colors flex items-center gap-2 ${selectedPlatform === 'twitter' ? 'bg-[#1DA1F2]/10 text-[#1DA1F2]' : ''}`}
                >
                  <Twitter className="w-4 h-4" />
                  <span>Twitter/X</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlatform('whatsapp')}
                  className={`hover:bg-[#25D366]/10 transition-colors flex items-center gap-2 ${selectedPlatform === 'whatsapp' ? 'bg-[#25D366]/10 text-[#25D366]' : ''}`}
                >
                  <SiWhatsapp className="w-4 h-4" />
                  <span>WhatsApp</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlatform('telegram')}
                  className={`hover:bg-[#0088cc]/10 transition-colors flex items-center gap-2 ${selectedPlatform === 'telegram' ? 'bg-[#0088cc]/10 text-[#0088cc]' : ''}`}
                >
                  <SiTelegram className="w-4 h-4" />
                  <span>Telegram</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlatform('linkedin')}
                  className={`hover:bg-[#0A66C2]/10 transition-colors flex items-center gap-2 ${selectedPlatform === 'linkedin' ? 'bg-[#0A66C2]/10 text-[#0A66C2]' : ''}`}
                >
                  <Linkedin className="w-4 h-4" />
                  <span>LinkedIn</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlatform('survey')}
                  className={`hover:bg-[#7C3AED]/10 transition-colors flex items-center gap-2 ${selectedPlatform === 'survey' ? 'bg-[#7C3AED]/10 text-[#7C3AED]' : ''}`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Survey</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlatform('snapchat')}
                  className={`hover:bg-[#FFFC00]/10 transition-colors flex items-center gap-2 ${selectedPlatform === 'snapchat' ? 'bg-[#FFFC00]/10 text-[#FFFC00]' : ''}`}
                >
                  <SiSnapchat className="w-4 h-4" />
                  <span>Snapchat</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlatform('pinterest')}
                  className={`hover:bg-[#E60023]/10 transition-colors flex items-center gap-2 ${selectedPlatform === 'pinterest' ? 'bg-[#E60023]/10 text-[#E60023]' : ''}`}
                >
                  <SiPinterest className="w-4 h-4" />
                  <span>Pinterest</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlatform('discord')}
                  className={`hover:bg-[#5865F2]/10 transition-colors flex items-center gap-2 ${selectedPlatform === 'discord' ? 'bg-[#5865F2]/10 text-[#5865F2]' : ''}`}
                >
                  <SiDiscord className="w-4 h-4" />
                  <span>Discord</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlatform('threads')}
                  className={`hover:bg-[#000000]/10 transition-colors flex items-center gap-2 ${selectedPlatform === 'threads' ? 'bg-[#000000]/10 text-[#000000]' : ''}`}
                >
                  <SiThreads className="w-4 h-4" />
                  <span>Threads</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlatform('google_review')}
                  className={`hover:bg-[#4285F4]/10 transition-colors flex items-center gap-2 ${selectedPlatform === 'google_review' ? 'bg-[#4285F4]/10 text-[#4285F4]' : ''}`}
                >
                  <SiGoogle className="w-4 h-4" />
                  <span>Google Review</span>
                </Button>
              </div>

              {/* Task Type Filters — only shown when tasks of that type exist; Other catches non-standard types */}
              {(() => {
                const availableTypes = new Set((tasks || []).map(t => t.type.toLowerCase()));
                const hasOther = (tasks || []).some(t => !KNOWN_TASK_TYPES.has(t.type.toLowerCase()));
                const allTypeChips = [
                  { type: 'follow', label: 'Follow', icon: <UserPlus className="w-3 h-3" /> },
                  { type: 'like', label: 'Like', icon: <Heart className="w-3 h-3" /> },
                  { type: 'comment', label: 'Comment', icon: <MessageSquare className="w-3 h-3" /> },
                  { type: 'share', label: 'Share', icon: <Share2 className="w-3 h-3" /> },
                  { type: 'survey', label: 'Survey', icon: <Star className="w-3 h-3" /> },
                  { type: 'view', label: 'Watch', icon: <Eye className="w-3 h-3" /> },
                ];
                const visibleChips = allTypeChips.filter(c => availableTypes.has(c.type));
                if (visibleChips.length === 0 && !hasOther) return null;
                return (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedType === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedType(null)}
                      className="flex items-center gap-1.5"
                    >
                      All Types
                    </Button>
                    {visibleChips.map(({ type, label, icon }) => (
                      <Button
                        key={type}
                        variant={selectedType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedType(type)}
                        className="flex items-center gap-1.5"
                      >
                        {icon}
                        {label}
                      </Button>
                    ))}
                    {hasOther && (
                      <Button
                        variant={selectedType === 'other' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedType('other')}
                        className="flex items-center gap-1.5"
                      >
                        Other
                      </Button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Enhanced Task Display Frame */}
          <motion.div 
            className="bg-gradient-to-br from-card via-card/98 to-card/95 rounded-xl p-8 mb-8 min-h-[300px] shadow-lg border border-border/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            data-tutorial="task-list"
          >
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              layout
            >
              <AnimatePresence>
                {isLoading ? (
                  // Enhanced loading skeletons
                  Array(6).fill(null).map((_, i) => (
                    <motion.div
                      key={`skeleton-${i}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.4 }}
                    >
                      <TaskCardSkeleton />
                    </motion.div>
                  ))
                ) : error ? (
                  // Enhanced error state
                  <motion.div 
                    className="col-span-full py-16 text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 text-red-600 rounded-xl p-8 border border-red-200/20">
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                          <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Unable to Load Tasks</h3>
                          <p className="text-sm text-muted-foreground mb-4">We encountered an issue while fetching your tasks.</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => refetch()}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                          >
                            Try Again
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : filteredTasks.length > 0 ? (
                  // Enhanced tasks grid with staggered animations
                  filteredTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        delay: index * 0.1, 
                        duration: 0.4,
                        ease: "easeOut"
                      }}
                      layout
                    >
                      <TaskCard
                        {...task}
                        onComplete={handleTaskComplete}
                      />
                    </motion.div>
                  ))
                ) : (
                  // Enhanced empty state
                  <motion.div 
                    className="col-span-full py-16 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="max-w-md mx-auto">
                      <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">No Tasks Available</h3>
                      <p className="text-muted-foreground mb-6">
                        {selectedPlatform || selectedStatus || selectedType || searchQuery
                          ? "No tasks match your current filters. Try adjusting your search criteria."
                          : "There are no tasks available at the moment. Check back later for new opportunities!"
                        }
                      </p>
                      {(selectedPlatform || selectedStatus || selectedType || searchQuery) && (
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSelectedPlatform(null);
                            setSelectedStatus(null);
                            setSelectedType(null);
                            setSearchQuery("");
                          }}
                          className="bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Completed Tasks List - Shows when "Completed" filter is active */}
          {selectedStatus === 'completed' && (
            <motion.div 
              className="bg-card rounded-xl p-6 mb-8 shadow-lg border border-border/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Completed Tasks History
              </h3>
              
              {isLoadingCompleted ? (
                <div className="space-y-2">
                  {Array(3).fill(null).map((_, i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : completedTasks && completedTasks.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {completedTasks.map((completedTask: any, index: number) => (
                    <motion.div
                      key={completedTask.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{completedTask.task?.title || 'Task Completed'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {completedTask.task?.platform && (
                              <span className="capitalize">{completedTask.task.platform}</span>
                            )}
                            {completedTask.task?.platform && completedTask.completedAt && ' • '}
                            {completedTask.completedAt && new Date(completedTask.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-green-600">
                            +{completedTask.pointsEarned || completedTask.task?.points || 0} points
                          </div>
                          {completedTask.verificationStatus && (
                            <div className={`text-xs mt-1 ${
                              completedTask.verificationStatus === 'verified' 
                                ? 'text-green-500' 
                                : completedTask.verificationStatus === 'pending'
                                ? 'text-yellow-500'
                                : 'text-red-500'
                            }`}>
                              {completedTask.verificationStatus}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <svg className="w-16 h-16 mx-auto mb-3 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No completed tasks yet</p>
                </div>
              )}
            </motion.div>
          )}
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
      <TasksContent />
    </ProtectedRoute>
  );
}

