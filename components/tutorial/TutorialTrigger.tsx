"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTutorial } from "@/contexts/TutorialContext";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Lightbulb, X, Play, HelpCircle } from "lucide-react";

export function NewUserTutorialPrompt() {
  const { user } = useAuth();
  const { hasCompletedTutorial, startTutorial, skipTutorial } = useTutorial();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user && !hasCompletedTutorial && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, hasCompletedTutorial, dismissed]);

  const handleStart = () => {
    setShowPrompt(false);
    startTutorial();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    skipTutorial();
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ duration: 0.4, type: "spring" }}
        className="fixed bottom-6 right-6 z-50 max-w-sm"
        data-testid="tutorial-prompt"
      >
        <div className="bg-card border border-border rounded-xl shadow-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">New Here? 👋</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mt-1 -mr-2"
                  onClick={handleDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Take a quick tour to learn how to earn points and unlock rewards!
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismiss}
                  data-testid="tutorial-prompt-skip"
                >
                  Skip for now
                </Button>
                <Button
                  size="sm"
                  onClick={handleStart}
                  data-testid="tutorial-prompt-start"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Start Tour
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function TutorialHelpButton() {
  const { startTutorial, hasCompletedTutorial } = useTutorial();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={startTutorial}
      className="gap-2"
      data-testid="tutorial-help-button"
    >
      <HelpCircle className="w-4 h-4" />
      <span className="hidden sm:inline">
        {hasCompletedTutorial ? "Replay Tutorial" : "Take Tour"}
      </span>
    </Button>
  );
}
