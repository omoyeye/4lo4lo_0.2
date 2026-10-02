"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CONSENT_KEY = "cookie_consent";

type ConsentValue = "accepted" | "rejected";

function getStoredConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

function grantAnalytics() {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted",
    });
  }
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      setVisible(true);
    } else if (stored === "accepted") {
      grantAnalytics();
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {}
    grantAnalytics();
    setVisible(false);
  }

  function reject() {
    try {
      localStorage.setItem(CONSENT_KEY, "rejected");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-xl rounded-xl border border-border bg-background/95 backdrop-blur-sm shadow-lg p-4 sm:p-5">
        <p className="text-sm text-foreground">
          We use cookies to keep you signed in and to understand how the site is
          used (via Google Analytics). No advertising cookies are set.{" "}
          <Link
            href="/privacy"
            className="underline text-primary hover:text-primary/80"
          >
            Privacy Policy
          </Link>
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={accept}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={reject}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            Reject non-essential
          </button>
        </div>
      </div>
    </div>
  );
}
