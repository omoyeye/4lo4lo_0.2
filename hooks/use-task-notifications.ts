"use client";


import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { useAuth } from './use-auth';

export function useTaskNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const lastTaskCountRef = useRef<number>(0);
  const hasInitialized = useRef(false);

  // Check for new tasks every 30 seconds
  const { data: tasks } = useQuery<any[]>({
    queryKey: ['/api/tasks/available', { userId: user?.id }],
    enabled: !!user,
    refetchInterval: 30000, // Check every 30 seconds
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!tasks || !Array.isArray(tasks)) return;

    const currentTaskCount = tasks.length;
    
    // Don't show notification on initial load
    if (!hasInitialized.current) {
      lastTaskCountRef.current = currentTaskCount;
      hasInitialized.current = true;
      return;
    }

    // Check if new tasks were added
    if (currentTaskCount > lastTaskCountRef.current) {
      const newTasksCount = currentTaskCount - lastTaskCountRef.current;
      
      toast({
        title: "🎉 New Tasks Available!",
        description: `${newTasksCount} new task${newTasksCount > 1 ? 's' : ''} just became available. Start earning points now!`,
        duration: 8000,
      });
    }

    lastTaskCountRef.current = currentTaskCount;
  }, [tasks, toast]);

  return { taskCount: tasks?.length || 0 };
}
