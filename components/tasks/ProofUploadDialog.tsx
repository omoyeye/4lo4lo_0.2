"use client";

import { useEffect, useRef, useState } from "react";
import { ImageUp, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { resizeImage } from "@/lib/image-resize";

interface Props {
  task: { id: number; title: string; points: number } | null;
  clickId?: number;
  onClose: () => void;
  onSubmitted: (message: string) => void;
}

/** Screenshot upload that finishes a task when proofs are switched on. */
export default function ProofUploadDialog({ task, onClose, onSubmitted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // State resets because the parent keys this component by task id.
  const pick = (next: File | null) => {
    setError(null);
    setFile(next);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return next ? URL.createObjectURL(next) : null;
    });
  };
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const submit = async () => {
    if (!task || !file) return;
    setBusy(true);
    setError(null);
    try {
      const image = await resizeImage(file, 1600);
      const form = new FormData();
      form.append("taskId", String(task.id));
      form.append("file", image, "proof.jpg");
      if (note.trim()) form.append("note", note.trim());
      const res = await fetch("/api/tasks/proof", { method: "POST", body: form, credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Upload failed");
      onSubmitted(data.message || "Proof submitted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload your proof</DialogTitle>
          <DialogDescription>
            Add a screenshot showing you finished <span className="font-medium text-foreground">{task?.title}</span>. Your {task?.points} points are added once it&apos;s approved.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/40 transition-colors hover:border-primary/50 hover:bg-muted"
        >
          {preview ? (
            <img src={preview} alt="Selected screenshot" className="h-full w-full object-contain" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <ImageUp className="h-8 w-8" />
              Tap to choose a screenshot
            </span>
          )}
        </button>

        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the reviewer (optional), e.g. your username on the platform" maxLength={500} rows={2} />

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Only the 4LO4LO team sees this image. Edited or reused screenshots are rejected.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={!file || busy} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit proof
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
