"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BellOff, BellRing, Loader2, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";

function UnsubscribeContent() {
  const params = useSearchParams();
  const u = params.get("u");
  const t = params.get("t");
  const [state, setState] = useState<"loading" | "unsubscribed" | "subscribed" | "error">(u && t ? "loading" : "error");
  const [busy, setBusy] = useState(false);
  const ran = useRef(false);

  const send = async (resubscribe: boolean) => {
    const res = await fetch("/api/email/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ u, t, resubscribe }),
    });
    if (!res.ok) throw new Error();
    setState(resubscribe ? "subscribed" : "unsubscribed");
  };

  // Opening the link unsubscribes straight away: no sign-in, no extra steps.
  useEffect(() => {
    if (!u || !t || ran.current) return;
    ran.current = true;
    send(false).catch(() => setState("error"));
  }, [u, t]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-background to-pink-50 p-4 dark:from-purple-950/20 dark:to-pink-950/20">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-xl">
        {state === "loading" && <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />}
        {state === "unsubscribed" && (
          <>
            <BellOff className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 text-2xl font-bold">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-muted-foreground">
              You won&apos;t get announcement emails any more. We&apos;ll still email you about your account, like sign-in codes, password resets and payouts.
            </p>
            <Button
              variant="outline"
              className="mt-6 w-full"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                send(true).catch(() => setState("error")).finally(() => setBusy(false));
              }}
            >
              Changed your mind? Resubscribe
            </Button>
          </>
        )}
        {state === "subscribed" && (
          <>
            <BellRing className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 text-2xl font-bold">Welcome back</h1>
            <p className="mt-2 text-muted-foreground">You&apos;ll get community announcements again.</p>
          </>
        )}
        {state === "error" && (
          <>
            <MailX className="mx-auto h-12 w-12 text-rose-600" />
            <h1 className="mt-4 text-2xl font-bold">Link didn&apos;t work</h1>
            <p className="mt-2 text-muted-foreground">
              You can turn announcements off in Settings → Notifications, or email support@4lo4lo.site and we&apos;ll do it for you.
            </p>
          </>
        )}
        <Link href="/" className="mt-6 inline-block text-sm text-primary hover:underline">
          Go to 4LO4LO
        </Link>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeContent />
    </Suspense>
  );
}
