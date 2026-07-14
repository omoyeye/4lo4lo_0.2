"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: "click" | "navigate" | "observe";
  route?: string;
}

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  hasCompletedTutorial: boolean;
  startTutorial: () => void;
  endTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  resetTutorial: () => void;
  goToStep: (step: number) => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to 4LO4LO! 🎉",
    description: "We're excited to have you here! This quick tutorial will show you how to earn points by completing social media tasks. Let's get started!",
    position: "center",
  },
  {
    id: "dashboard",
    title: "Your Dashboard",
    description: "This is your home base! Here you can see your points, recent activity, and top earners. Keep track of your progress at a glance.",
    targetSelector: "[data-tutorial='dashboard-stats']",
    position: "bottom",
  },
  {
    id: "sidebar",
    title: "Navigation Menu",
    description: "Use this sidebar to navigate between different sections of the app. Access Tasks, Rewards, Referrals, and your Settings from here.",
    targetSelector: "[data-tutorial='sidebar']",
    position: "right",
  },
  {
    id: "tasks",
    title: "Complete Tasks",
    description: "The Tasks page is where you'll find social media tasks to complete. Each task earns you points that you can redeem for rewards!",
    targetSelector: "[data-tutorial='tasks-link']",
    position: "right",
    action: "navigate",
    route: "/tasks",
  },
  {
    id: "task-filters",
    title: "Filter Tasks",
    description: "Use these filters to find tasks for specific platforms like YouTube, TikTok, Instagram, and more. Find tasks that match your social media presence!",
    targetSelector: "[data-tutorial='platform-filters']",
    position: "bottom",
  },
  {
    id: "task-cards",
    title: "Task Cards",
    description: "Each card shows a task you can complete. Click 'Start Task' to open the social media link, complete the action, then click 'Complete' to earn your points!",
    targetSelector: "[data-tutorial='task-list']",
    position: "top",
  },
  {
    id: "rewards",
    title: "Redeem Rewards",
    description: "Once you've earned enough points, head to the Rewards page to redeem them for exciting prizes and cash rewards!",
    targetSelector: "[data-tutorial='rewards-link']",
    position: "right",
    action: "navigate",
    route: "/rewards",
  },
  {
    id: "referrals",
    title: "Invite Friends",
    description: "Share your referral code with friends! When they sign up and complete tasks, you both earn bonus points. Grow your network and earnings!",
    targetSelector: "[data-tutorial='referral-link']",
    position: "right",
    action: "navigate",
    route: "/referral",
  },
  {
    id: "settings",
    title: "Your Profile",
    description: "Customize your profile, add your social media handles, and manage your account settings. You can also download your digital ID card here!",
    targetSelector: "[data-tutorial='settings-link']",
    position: "right",
  },
  {
    id: "complete",
    title: "You're All Set! 🚀",
    description: "That's everything you need to know! Start completing tasks to earn points and unlock amazing rewards. Have fun and happy earning!",
    position: "center",
  },
];

const STORAGE_KEY = "4lo4lo_tutorial_completed";

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);

  useEffect(() => {
    const completed = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null);
    setHasCompletedTutorial(completed === "true");
  }, []);

  const startTutorial = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const endTutorial = () => {
    setIsActive(false);
    setCurrentStep(0);
    (typeof window !== 'undefined' ? localStorage.setItem(STORAGE_KEY, "true") : undefined);
    setHasCompletedTutorial(true);
  };

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      endTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const skipTutorial = () => {
    endTutorial();
  };

  const resetTutorial = () => {
    (typeof window !== 'undefined' ? localStorage.removeItem(STORAGE_KEY) : undefined);
    setHasCompletedTutorial(false);
    setCurrentStep(0);
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < TUTORIAL_STEPS.length) {
      setCurrentStep(step);
    }
  };

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        steps: TUTORIAL_STEPS,
        hasCompletedTutorial,
        startTutorial,
        endTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        resetTutorial,
        goToStep,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}
