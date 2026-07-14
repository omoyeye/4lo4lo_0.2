"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTutorial } from "@/contexts/TutorialContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, ChevronLeft, ChevronRight, Sparkles, SkipForward, RotateCcw } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface SpotlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function TutorialOverlay() {
  const {
    isActive,
    currentStep,
    steps,
    nextStep,
    prevStep,
    skipTutorial,
  } = useTutorial();

  const router = useRouter();
  const setLocation = (p: string) => router.push(p);
  const [spotlightPos, setSpotlightPos] = useState<SpotlightPosition | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const updateSpotlight = useCallback(() => {
    if (!currentStepData?.targetSelector) {
      setSpotlightPos(null);
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const element = document.querySelector(currentStepData.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      const padding = 8;

      setSpotlightPos({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      const position = currentStepData.position || "bottom";
      const tooltipWidth = 340;
      const tooltipHeight = 200;
      let style: React.CSSProperties = { position: "fixed" };

      switch (position) {
        case "top":
          style.top = rect.top - tooltipHeight - 20;
          style.left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "bottom":
          style.top = rect.bottom + 20;
          style.left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "left":
          style.top = rect.top + rect.height / 2 - tooltipHeight / 2;
          style.left = rect.left - tooltipWidth - 20;
          break;
        case "right":
          style.top = rect.top + rect.height / 2 - tooltipHeight / 2;
          style.left = rect.right + 20;
          break;
        default:
          style.top = "50%";
          style.left = "50%";
          style.transform = "translate(-50%, -50%)";
      }

      if (typeof style.left === "number") {
        style.left = Math.max(20, Math.min(style.left, window.innerWidth - tooltipWidth - 20));
      }
      if (typeof style.top === "number") {
        style.top = Math.max(20, Math.min(style.top, window.innerHeight - tooltipHeight - 20));
      }

      setTooltipStyle(style);
    } else {
      setSpotlightPos(null);
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
    }
  }, [currentStepData]);

  useEffect(() => {
    if (!isActive) return;

    if (currentStepData?.route) {
      setLocation(currentStepData.route);
      setTimeout(updateSpotlight, 300);
    } else {
      updateSpotlight();
    }

    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight);

    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight);
    };
  }, [isActive, currentStep, currentStepData, setLocation, updateSpotlight]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        data-testid="tutorial-overlay"
      >
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "none" }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {spotlightPos && (
                <rect
                  x={spotlightPos.left}
                  y={spotlightPos.top}
                  width={spotlightPos.width}
                  height={spotlightPos.height}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
            style={{ pointerEvents: "auto" }}
            onClick={(e) => e.stopPropagation()}
          />
        </svg>

        {spotlightPos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute rounded-lg ring-4 ring-primary ring-opacity-50"
            style={{
              top: spotlightPos.top,
              left: spotlightPos.left,
              width: spotlightPos.width,
              height: spotlightPos.height,
              pointerEvents: "none",
            }}
          />
        )}

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-border rounded-xl shadow-2xl p-6 w-[340px] max-w-[90vw]"
          style={tooltipStyle}
          data-testid="tutorial-tooltip"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={skipTutorial}
              className="h-8 w-8"
              data-testid="tutorial-close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Progress value={progress} className="h-1.5 mb-4" />

          <h3 className="text-lg font-semibold mb-2">{currentStepData?.title}</h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {currentStepData?.description}
          </p>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={skipTutorial}
              className="text-muted-foreground hover:text-foreground"
              data-testid="tutorial-skip"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Skip
            </Button>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevStep}
                  data-testid="tutorial-prev"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button
                size="sm"
                onClick={nextStep}
                data-testid="tutorial-next"
              >
                {currentStep === steps.length - 1 ? (
                  "Get Started"
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
