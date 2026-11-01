"use client";

import { useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type Kind = "level" | "streak" | "badge";

const KINDS: { value: Kind; label: string }[] = [
  { value: "level", label: "My level" },
  { value: "streak", label: "My streak" },
  { value: "badge", label: "Latest badge" },
];

/** Share a branded image of your level, streak or newest badge. */
export default function ShareAchievementCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("level");
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const src = `/api/share/card?kind=${kind}&v=${user.points}-${user.streakCount}`;

  const getFile = async () => {
    const res = await fetch(src, { credentials: "include" });
    if (!res.ok) throw new Error("Couldn't create the image");
    return new File([await res.blob()], `4lo4lo-${kind}.png`, { type: "image/png" });
  };

  const share = async () => {
    setBusy(true);
    try {
      const file = await getFile();
      const link = `${window.location.origin}/auth?ref=${user.referralCode}`;
      const text = `I'm level ${user.level} on 4LO4LO with ${user.points.toLocaleString()} points. Join me: ${link}`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, title: "4LO4LO" });
      } else {
        await navigator.clipboard.writeText(text);
        download(file);
        toast({ title: "Image saved, link copied", description: "Post the image and paste the link with it." });
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        toast({ title: "Couldn't share", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  const download = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <div className="flex flex-col justify-between gap-4 rounded-2xl border bg-gradient-to-br from-purple-600 to-pink-600 p-5 text-white shadow-sm">
        <div>
          <p className="text-sm text-white/80">Show off your progress</p>
          <p className="text-2xl font-bold">Level {user.level}</p>
          <p className="text-sm text-white/80">Share a card and earn when friends join with your code.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full bg-white text-purple-700 hover:bg-white/90">
          <Share2 className="mr-2 h-4 w-4" /> Create share card
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share your achievement</DialogTitle>
            <DialogDescription>Your referral code is printed on the card.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-1.5 rounded-xl bg-muted/60 p-1">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                className={kind === k.value ? "flex-1 rounded-lg bg-background px-3 py-1.5 text-sm font-medium shadow-sm" : "flex-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground"}
              >
                {k.label}
              </button>
            ))}
          </div>
          <img key={src} src={src} alt="Achievement card preview" className="aspect-square w-full rounded-2xl bg-muted object-cover" />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" disabled={busy} onClick={async () => download(await getFile())}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
            <Button disabled={busy} onClick={share} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
