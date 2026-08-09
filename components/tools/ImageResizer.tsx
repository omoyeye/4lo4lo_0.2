"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, ImageOff } from "lucide-react";

/**
 * Platform image resizer.
 *
 * Runs entirely on a canvas in the browser: the file never leaves the device,
 * which is both a genuine privacy win worth advertising on the page and the
 * reason this tool costs nothing to run at any traffic volume.
 */

interface Preset {
  id: string;
  group: string;
  label: string;
  width: number;
  height: number;
}

const PRESETS: Preset[] = [
  { id: "ig-square", group: "Instagram", label: "Square post (1:1)", width: 1080, height: 1080 },
  { id: "ig-portrait", group: "Instagram", label: "Portrait post (4:5)", width: 1080, height: 1350 },
  { id: "ig-story", group: "Instagram", label: "Story / Reel (9:16)", width: 1080, height: 1920 },
  { id: "tiktok", group: "TikTok", label: "Video cover (9:16)", width: 1080, height: 1920 },
  { id: "yt-thumb", group: "YouTube", label: "Thumbnail (16:9)", width: 1280, height: 720 },
  { id: "yt-banner", group: "YouTube", label: "Channel banner", width: 2560, height: 1440 },
  { id: "x-post", group: "X (Twitter)", label: "Post image (16:9)", width: 1600, height: 900 },
  { id: "x-header", group: "X (Twitter)", label: "Header", width: 1500, height: 500 },
  { id: "li-post", group: "LinkedIn", label: "Post image", width: 1200, height: 627 },
  { id: "li-banner", group: "LinkedIn", label: "Profile banner", width: 1584, height: 396 },
  { id: "fb-post", group: "Facebook", label: "Post image", width: 1200, height: 630 },
  { id: "fb-cover", group: "Facebook", label: "Cover photo", width: 1640, height: 856 },
  { id: "og", group: "Web", label: "Open Graph / link preview", width: 1200, height: 630 },
];

type FitMode = "cover" | "contain";

export function ImageResizer() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [presetId, setPresetId] = useState("ig-portrait");
  const [fit, setFit] = useState<FitMode>("cover");
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const preset = PRESETS.find((p) => p.id === presetId)!;

  const handleFile = useCallback((file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("That file is not an image.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Image is larger than 15MB. Try a smaller file.");
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setFileName(file.name.replace(/\.[^.]+$/, ""));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setError("Could not read that image.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  // Redraw whenever the image, target size or fit mode changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    canvas.width = preset.width;
    canvas.height = preset.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (fit === "contain") {
      // Letterbox onto white so the exported file has no transparent bars
      // (several platforms render transparency as black).
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const scale =
      fit === "cover"
        ? Math.max(preset.width / image.width, preset.height / image.height)
        : Math.min(preset.width / image.width, preset.height / image.height);

    const w = image.width * scale;
    const h = image.height * scale;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, (preset.width - w) / 2, (preset.height - h) / 2, w, h);
  }, [image, preset, fit]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName || "image"}-${preset.width}x${preset.height}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const groups = Array.from(new Set(PRESETS.map((p) => p.group)));

  return (
    <Card>
      <CardContent className="p-6">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className="rounded-lg border-2 border-dashed p-8 text-center"
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Drop an image here, or</p>
          <label className="mt-2 inline-block">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <span className="cursor-pointer rounded-md border px-4 py-2 text-sm hover:bg-accent">
              Choose a file
            </span>
          </label>
          <p className="mt-3 text-xs text-muted-foreground">
            Processed in your browser. The file is never uploaded.
          </p>
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
            <ImageOff className="h-4 w-4" />
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="ir-preset">Target size</Label>
            <Select value={presetId} onValueChange={setPresetId}>
              <SelectTrigger id="ir-preset" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectGroup key={g}>
                    <SelectLabel>{g}</SelectLabel>
                    {PRESETS.filter((p) => p.group === g).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label} · {p.width}×{p.height}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ir-fit">Fit</Label>
            <Select value={fit} onValueChange={(v) => setFit(v as FitMode)}>
              <SelectTrigger id="ir-fit" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Crop to fill (no bars)</SelectItem>
                <SelectItem value="contain">Fit whole image (white bars)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6">
          {image ? (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                Preview, output will be {preset.width}×{preset.height}px
                {image.width < preset.width && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400">
                    (your source is {image.width}px wide, so it will be upscaled and may look soft)
                  </span>
                )}
              </p>
              <canvas
                ref={canvasRef}
                className="max-h-[420px] w-auto max-w-full rounded-lg border bg-muted"
                style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
              />
              <Button className="mt-4" onClick={download}>
                <Download className="mr-1.5 h-4 w-4" />
                Download PNG
              </Button>
            </>
          ) : (
            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              Add an image to see the resized preview.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
