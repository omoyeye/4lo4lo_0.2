"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { resizeAvatar } from "@/lib/image-resize";

/** Profile photo picker: square-crops and shrinks in the browser, then uploads. */
export default function AvatarUploader() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const name = user.displayName || user.username;
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", await resizeAvatar(file), "avatar.jpg");
      const res = await fetch("/api/user/avatar", { method: "POST", body: form, credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Upload failed");
      await refetchUser();
      toast({ title: "Profile photo updated" });
    } catch (e) {
      toast({ title: "Couldn't update photo", description: e instanceof Error ? e.message : "Please try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Couldn't remove photo");
      await refetchUser();
    } catch (e) {
      toast({ title: "Couldn't remove photo", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-2xl font-bold text-white"
        aria-label="Change profile photo"
      >
        {user.avatar ? (
          <img src={user.avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">{initials}</span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Profile photo</p>
        <p className="text-sm text-muted-foreground">Shown on your profile, the leaderboard and the community feed.</p>
        <div className="mt-2 flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            {user.avatar ? "Change" : "Upload photo"}
          </Button>
          {user.avatar && (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={remove} className="text-muted-foreground">
              <Trash2 className="mr-1 h-4 w-4" /> Remove
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) upload(f);
        }}
      />
    </div>
  );
}
