"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const CONSENT_KEY = "cookie_consent";

type ConsentValue = "accepted" | "rejected";

export function getStoredConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

function setAnalytics(granted: boolean) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: granted ? "granted" : "denied",
    });
  }
}

/**
 * Withdrawing consent must also remove what was already stored (UK/EU
 * ePrivacy), not just stop new writes. GA sets _ga and _ga_<id> on the
 * registrable domain, so clear them on every parent domain level.
 */
function clearAnalyticsCookies() {
  const names = document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter((n) => n === "_ga" || n.startsWith("_ga_") || n === "_gid");
  const parts = location.hostname.split(".");
  const domains = parts.map((_, i) => parts.slice(i).join(".")).filter((d) => d.includes("."));
  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; path=/; domain=.${d}`;
  }
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function openCookieConsent() {
  window.dispatchEvent(new Event("open-cookie-consent"));
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<ConsentValue | null>(null);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      setVisible(true);
    } else if (stored === "accepted") {
      setAnalytics(true);
    }

    const handleOpen = () => {
      setCurrent(getStoredConsent());
      setVisible(true);
    };
    window.addEventListener("open-cookie-consent", handleOpen);
    return () => window.removeEventListener("open-cookie-consent", handleOpen);
  }, []);

  function choose(value: ConsentValue) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
      // Other first-visit popups wait for this so they don't stack on the banner.
      window.dispatchEvent(new Event("cookie-consent-chosen"));
    } catch {}
    setAnalytics(value === "accepted");
    if (value === "rejected") clearAnalyticsCookies();
    setCurrent(value);
    setVisible(false);
  }

  if (!visible) return null;

  // Equal weight for both choices: regulators (ICO, CNIL) treat a bright
  // "Accept" next to a faint "Reject" as nudging.
  const button = "flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors";

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-4 sm:p-6" role="dialog" aria-live="polite" aria-label="Cookie preferences">
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-background/95 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-foreground">Your privacy choices</p>
            <p className="text-muted-foreground">
              We use essential cookies and storage to keep you signed in and secure. With your permission we&apos;d also like to use Google Analytics to see how
              the site is used. No advertising cookies, ever.{" "}
              <Link href="/privacy#cookies-and-similar-technologies" className="text-primary underline hover:text-primary/80">
                Details
              </Link>
            </p>
            {current && <p className="text-xs text-muted-foreground">Current choice: analytics {current === "accepted" ? "allowed" : "off"}.</p>}
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={() => choose("rejected")} className={`${button} border-border bg-background text-foreground hover:bg-muted`}>
            Essential only
          </button>
          <button onClick={() => choose("accepted")} className={`${button} border-border bg-background text-foreground hover:bg-muted`}>
            Allow analytics
          </button>
        </div>
      </div>
    </div>
  );
}
