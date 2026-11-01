"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

function VerifyEmailContent() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"loading" | "done" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "" : "This link is missing its code. Open the link from your email again.");
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "This link is invalid or has already been used.");
        setState("done");
        queryClient.invalidateQueries({ queryKey: ["/api/auth/verify-email"] });
      })
      .catch((e: Error) => {
        setState("error");
        setMessage(e.message);
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-background to-pink-50 p-4 dark:from-purple-950/20 dark:to-pink-950/20">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-xl">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h1 className="mt-4 text-xl font-bold">Confirming your email…</h1>
          </>
        )}
        {state === "done" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">Email confirmed</h1>
            <p className="mt-2 text-muted-foreground">Thanks! You can now request payouts.</p>
            <Button asChild className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </>
        )}
        {state === "error" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
              <MailX className="h-9 w-9 text-rose-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">Link didn&apos;t work</h1>
            <p className="mt-2 text-muted-foreground">{message}</p>
            <p className="mt-1 text-sm text-muted-foreground">You can send a new link from Settings.</p>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link href="/settings">Open settings</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
