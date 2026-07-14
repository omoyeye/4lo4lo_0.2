"use client";


import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, ArrowRight } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';

interface TaskNotificationProps {
  isVisible: boolean;
  taskCount: number;
  onDismiss: () => void;
  onViewTasks: () => void;
}

export function TaskNotification({ isVisible, taskCount, onDismiss, onViewTasks }: TaskNotificationProps) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldShow(true);
      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => {
        setShouldShow(false);
        onDismiss();
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss]);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.9 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl border-0">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-full">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">New Tasks Available!</h3>
                    <p className="text-xs text-white/90 mt-1">
                      {taskCount} new task{taskCount > 1 ? 's' : ''} ready to complete
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShouldShow(false);
                    onDismiss();
                  }}
                  className="text-white hover:bg-white/20 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                onClick={onViewTasks}
                size="sm"
                className="w-full mt-3 bg-white text-blue-600 hover:bg-white/90"
              >
                View Tasks
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
