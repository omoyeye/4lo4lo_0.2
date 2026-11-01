/**
 * Browser-side image downscale before upload. Phone screenshots are often
 * 3-6 MB; re-encoding to JPEG at a sensible size keeps uploads fast and well
 * under the server limits (lib/media.ts).
 */
export async function resizeImage(file: File, maxSide: number, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("That image couldn't be read. Try a JPG or PNG.");

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process images");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Couldn't prepare the image");
  return blob;
}

/** Square centre-crop for profile photos. */
export async function resizeAvatar(file: File, size = 400): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("That image couldn't be read. Try a JPG or PNG.");
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(size, side);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process images");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Couldn't prepare the image");
  return blob;
}
