import { useEffect } from 'react';

export function usePWAAnalytics() {
  useEffect(() => {
    // Track if app is installed (running in standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone ||
                         document.referrer.includes('android-app://');

    if (isStandalone) {
      console.log('App is running in standalone mode (installed PWA)');
      
      // Track PWA launch
      trackEvent('pwa_launch', {
        display_mode: 'standalone',
        referrer: document.referrer
      });
    }

    // Track display mode changes
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        trackEvent('pwa_installed', {
          timestamp: new Date().toISOString()
        });
      }
    };

    if (displayModeQuery.addEventListener) {
      displayModeQuery.addEventListener('change', handleDisplayModeChange);
    }

    // Track app visibility (user engagement)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackEvent('pwa_hidden', {
          timestamp: new Date().toISOString()
        });
      } else {
        trackEvent('pwa_visible', {
          timestamp: new Date().toISOString()
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track online/offline status
    const handleOnline = () => {
      trackEvent('pwa_online', {
        timestamp: new Date().toISOString()
      });
    };

    const handleOffline = () => {
      trackEvent('pwa_offline', {
        timestamp: new Date().toISOString()
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      if (displayModeQuery.removeEventListener) {
        displayModeQuery.removeEventListener('change', handleDisplayModeChange);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
}

function trackEvent(eventName: string, eventData?: Record<string, any>) {
  // Log to console in development
  if (process.env.DEV) {
    console.log('PWA Analytics:', eventName, eventData);
  }

  // Send to analytics service if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventData);
  }

  // Store in localStorage for basic tracking
  try {
    const events = JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('pwa_analytics') : null) || '[]');
    events.push({
      event: eventName,
      data: eventData,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 events
    if (events.length > 50) {
      events.shift();
    }
    
    (typeof window !== 'undefined' ? localStorage.setItem('pwa_analytics', JSON.stringify(events)) : undefined);
  } catch (error) {
    console.error('Failed to store analytics event:', error);
  }
}

export function getPWAAnalytics() {
  try {
    return JSON.parse((typeof window !== 'undefined' ? localStorage.getItem('pwa_analytics') : null) || '[]');
  } catch {
    return [];
  }
}
