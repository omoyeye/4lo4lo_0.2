"use client";

import { useEffect } from "react";

/**
 * Registers the service worker.
 *
 * THIS WAS MISSING ENTIRELY. public/service-worker.js was written, served at
 * 200, and referenced by components, but nothing ever called
 * navigator.serviceWorker.register(). Verified on production:
 * getRegistrations() returned 0 and navigator.serviceWorker.controller was
 * null, so the app had no offline support, no runtime caching, and could not
 * satisfy the installability criteria that depend on an active worker.
 *
 * It also left PWAUpdatePrompt permanently dead: that component awaits
 * navigator.serviceWorker.ready, a promise which never resolves when nothing
 * is registered, so its update flow could never fire.
 *
 * Production only. Registering in development caches dev assets and produces
 * confusing stale-content bugs while iterating.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          "/service-worker.js",
          { scope: "/" }
        );
        if (cancelled) return;

        // Check for a new worker on load. Without this, a returning visitor
        // can sit on a cached build until the browser decides to re-check.
        registration.update().catch(() => {});
      } catch (error) {
        // A failed registration must never break the page. The app works
        // fine without a worker; it just loses offline support.
        console.error("[pwa] service worker registration failed:", error);
      }
    };

    // Wait for load so registration never competes with first paint for
    // bandwidth on a slow connection.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
