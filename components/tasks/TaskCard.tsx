"use client";


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getPlatformGradient = (platform: string) => {
  const gradients = {
    facebook: "from-blue-500 to-blue-600",
    instagram: "from-pink-500 to-purple-600",
    twitter: "from-blue-400 to-blue-500",
    tiktok: "from-black to-red-500",
    youtube: "from-red-500 to-red-600",
    linkedin: "from-blue-600 to-blue-700",
    default: "from-primary to-purple-600"
  };
  return gradients[platform as keyof typeof gradients] || gradients.default;
};

type TaskProps = {
  id: number;
  title: string;
  description: string;
  points: number;
  platform: string;
  taskUrl?: string;
  onComplete: (taskId: number, clickId?: number) => void;
};

export default function TaskCard({ id, title, description, points, platform, taskUrl, onComplete }: TaskProps) {
  const [similarTasks, setSimilarTasks] = useState<TaskProps[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [clickId, setClickId] = useState<number | null>(null);
  const { user } = useAuth();
  
  // Mutation for tracking task clicks
  const trackClickMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      const response = await fetch("/api/tasks/click", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          taskId: id,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to track task click");
      }
      
      return response.json();
    },
  });

  const handleComplete = async () => {
    try {
      // First, track the click
      const clickResult = await trackClickMutation.mutateAsync();
      setClickId(clickResult.id);
      
      // Get similar tasks to show in dropdown
      const response = await fetch(`/api/tasks/similar/${platform}`);
      if (!response.ok) throw new Error('Failed to fetch similar tasks');
      const tasks = await response.json();
      setSimilarTasks(tasks);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error handling task completion:', error);
    }
  };

  const handleUrlClick = (url: string) => {
    // Open URL in new tab with heat map tracking
    window.open(url, '_blank', 'noopener,noreferrer');
    
    // Complete the task after URL is opened
    setTimeout(() => {
      onComplete(id, clickId || undefined);
      setShowDropdown(false);
    }, 500);
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      whileHover={{ 
        scale: 1.03, 
        y: -8,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="group relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-violet-600/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <Card className="relative bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-violet-600" />
        
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-3 flex-1">
              <motion.h3 
                className="font-bold text-xl text-foreground group-hover:text-primary transition-colors duration-300"
                animate={isHovered ? { x: 4 } : { x: 0 }}
                transition={{ duration: 0.2 }}
              >
                {title}
              </motion.h3>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
            </div>
            
            <motion.div
              animate={isHovered ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-shrink-0"
            >
              <span className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-primary to-purple-600 rounded-full text-sm font-bold text-primary-foreground shadow-lg">
                {points} pts
              </span>
            </motion.div>
          </div>
          
          <div className="flex justify-between items-center gap-2 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getPlatformGradient(platform)}`} />
              <span className="text-sm font-medium text-foreground capitalize">{platform}</span>
            </div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <DropdownMenu onOpenChange={(open) => {
                if (open && !showDropdown) {
                  handleComplete();
                }
              }}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm" 
                    className="px-8 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                  >
                    Complete Task
                    <ChevronDown size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {/* Main task URL */}
                  {taskUrl && (
                    <DropdownMenuItem 
                      onClick={() => handleUrlClick(taskUrl)}
                      className="flex items-center gap-2 p-3"
                    >
                      <ExternalLink size={16} />
                      <div className="flex flex-col">
                        <span className="font-medium">Main Task</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {taskUrl}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  )}
                  
                  {/* Similar tasks URLs */}
                  {similarTasks.length > 0 && similarTasks.map((task) => (
                    <DropdownMenuItem 
                      key={task.id}
                      onClick={() => handleUrlClick(task.taskUrl || '')}
                      className="flex items-center gap-2 p-3"
                    >
                      <ExternalLink size={16} />
                      <div className="flex flex-col">
                        <span className="font-medium">{task.title}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {task.taskUrl}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  
                  {!taskUrl && similarTasks.length === 0 && (
                    <DropdownMenuItem disabled className="p-3">
                      No URLs available for this task
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
