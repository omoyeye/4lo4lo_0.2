"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Check for updates every 60 minutes
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                setWaitingWorker(newWorker);
                setShowUpdate(true);
              }
            });
          }
        });
      });

      // Listen for controller change (when new SW takes over)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdate(false);
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  return (
    <AnimatePresence>
      {showUpdate && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50"
        >
          <Card className="shadow-lg border-2 border-blue-500/20 bg-blue-50 dark:bg-blue-950">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <RefreshCcw className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Update Available
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    A new version of GrowSocial is available. Update now for the latest features and improvements!
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleUpdate} 
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="button-update-pwa"
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Update Now
                    </Button>
                    <Button 
                      onClick={handleDismiss} 
                      variant="outline" 
                      size="sm"
                      data-testid="button-dismiss-update"
                    >
                      Later
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
