"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";

export function OfflineFallback() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (typeof window !== 'undefined' && navigator.onLine) {
      window.location.reload();
    }
  };

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto"
    >
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
              <WifiOff className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle>You're Offline</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            It looks like you've lost your internet connection. Some features may not be available until you're back online.
          </p>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-1">What you can still do:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>View previously loaded content</li>
              <li>Access cached pages</li>
              <li>Your progress is saved locally</li>
            </ul>
          </div>

          <Button
            onClick={handleRetry}
            className="w-full"
            disabled={!isOnline}
            data-testid="button-retry-connection"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            {isOnline ? 'Retry Connection' : 'Waiting for Connection...'}
          </Button>

          {isOnline && (
            <p className="text-sm text-center text-green-600 dark:text-green-400">
              ✓ Connection restored! Click retry to continue.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
