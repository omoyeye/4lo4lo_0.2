"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

/** Real self-service deletion (POST /api/user/delete-account), then signs out. */
export default function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Google sign-ups never chose a password, so they only type DELETE.
  const needsPassword = !(user as { googleLinked?: boolean } | null)?.googleLinked;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't delete your account");
      await fetch("/api/logout", { method: "POST", credentials: "include" }).catch(() => {});
      queryClient.clear();
      try {
        localStorage.removeItem("userId");
        localStorage.removeItem("isAdmin");
      } catch {}
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete your account");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            Your profile, photo, social handles, links and notifications are erased and you&apos;ll be signed out. Your points, open
            marketplace listings and any pending withdrawal are forfeited. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {needsPassword && (
            <div className="space-y-1.5">
              <Label htmlFor="del-password">Your password</Label>
              <Input id="del-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="del-confirm">Type DELETE to confirm</Label>
            <Input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy || confirm !== "DELETE" || (needsPassword && !password)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete my account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
