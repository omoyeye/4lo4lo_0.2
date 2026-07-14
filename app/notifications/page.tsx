"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Trash2, X, ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";

interface Notification {
  id: number;
  userId: number | null;
  adminOnly: boolean;
  type: string;
  title: string;
  message: string;
  data: string | null;
  isRead: boolean;
  createdAt: string;
}

function NotificationsContent() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 60000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete notification");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_task":
        return "🎯";
      case "points_threshold":
        return "💰";
      case "referral_milestone":
        return "👥";
      case "task_approved":
        return "✅";
      case "task_rejected":
        return "❌";
      case "payout_processed":
        return "💵";
      case "system_announcement":
        return "📢";
      case "promote_me":
        return "⭐";
      default:
        return "🔔";
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case "new_task":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "points_threshold":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "referral_milestone":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "task_approved":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "task_rejected":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "payout_processed":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "system_announcement":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "promote_me":
        return "bg-pink-500/10 text-pink-500 border-pink-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatNotificationType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const groupNotificationsByDate = (notifications: Notification[]) => {
    const groups: { [key: string]: Notification[] } = {};
    
    notifications.forEach(notification => {
      const date = new Date(notification.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = "Yesterday";
      } else {
        key = format(date, "MMMM d, yyyy");
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(notification);
    });
    
    return groups;
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Notifications
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Stay updated on your activities and announcements
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="font-medium">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </motion.div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="border-b border-border/30 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">All Notifications</CardTitle>
                <CardDescription>
                  {notifications.length} total notifications
                </CardDescription>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="p-4 rounded-full bg-muted/30 mb-4">
                <Bell className="h-12 w-12 opacity-30" />
              </div>
              <p className="text-lg font-medium">No notifications yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                You'll see notifications here when there's activity on your account
              </p>
            </div>
          ) : (
            <div>
              {Object.entries(groupedNotifications).map(([date, dateNotifications], groupIndex) => (
                <div key={date}>
                  <div className="sticky top-0 bg-muted/50 backdrop-blur-sm px-4 py-2 border-b border-border/20">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {date}
                    </span>
                  </div>
                  <AnimatePresence mode="popLayout">
                    {dateNotifications.map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        transition={{ delay: index * 0.02, duration: 0.2 }}
                        className={cn(
                          "relative group px-4 py-4 border-b border-border/20 hover:bg-muted/30 transition-colors cursor-pointer",
                          !notification.isRead && "bg-primary/5"
                        )}
                        onClick={() => {
                          if (!notification.isRead) {
                            markAsReadMutation.mutate(notification.id);
                          }
                        }}
                      >
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 text-2xl pt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className={cn(
                                "text-sm flex-1",
                                !notification.isRead ? "font-semibold" : "font-medium"
                              )}>
                                {notification.title}
                              </h4>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", getNotificationBadgeColor(notification.type))}
                                >
                                  {formatNotificationType(notification.type)}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notification.isRead && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsReadMutation.mutate(notification.id);
                                    }}
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Mark read
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotificationMutation.mutate(notification.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        {!notification.isRead && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-primary rounded-r-full" />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




﻿import { ProtectedRoute } from "@/lib/protected-route";
export default function Page() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}

