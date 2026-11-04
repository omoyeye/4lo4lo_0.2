"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MailCheck, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export interface VerificationStatus {
  enabled: boolean;
  verified: boolean;
  required: boolean;
  email: string;
}

export function useEmailVerification() {
  const { user } = useAuth();
  return useQuery<VerificationStatus>({
    queryKey: ["/api/auth/verify-email"],
    enabled: !!user,
    staleTime: 60_000,
  });
}

/**
 * "Confirm your email" prompt. Renders nothing once verified (unless
 * showVerified) or while the feature isn't enabled.
 */
export default function EmailVerificationBanner({ showVerified = false }: { showVerified?: boolean }) {
  const { data } = useEmailVerification();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  if (!data?.enabled) return null;
  if (data.verified) {
    if (!showVerified) return null;
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
        <MailCheck className="h-5 w-5 shrink-0 text-emerald-600" />
        <span>
          <span className="break-all font-medium">{data.email}</span> is confirmed.
        </span>
      </div>
    );
  }

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Couldn't send the email");
      toast({ title: "Check your inbox", description: `We sent a confirmation link to ${body.email ?? data.email}.` });
    } catch (e) {
      toast({ title: "Couldn't send the email", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/5 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 text-sm">
          <p className="font-medium">Confirm your email address</p>
          <p className="text-muted-foreground">
            {data.required ? "You need a confirmed email to request payouts. " : ""}
            We&apos;ll send a link to <span className="break-all font-medium text-foreground">{data.email}</span>.
          </p>
        </div>
      </div>
      <Button size="sm" variant="outline" disabled={sending} onClick={send} className="shrink-0">
        {sending ? "Sending…" : "Send link"}
      </Button>
    </div>
  );
}
