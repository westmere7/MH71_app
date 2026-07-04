"use client";

import imageCompression from "browser-image-compression";
import { getSupabaseBrowser } from "./supabase/client";

/**
 * Compress an image in the browser, upload to a public Supabase Storage
 * bucket, and return its public URL.
 */
export async function uploadImage(
  bucket: "tenant-photos" | "meter-notes",
  file: File,
  keyPrefix = "",
  toWebp = false,
): Promise<string> {
  const options: any = {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
  };
  if (toWebp) {
    options.fileType = "image/webp";
  }
  const compressed = await imageCompression(file, options);

  const ext = toWebp ? "webp" : (file.name.split(".").pop() || "jpg").toLowerCase();
  // avoid Date.now()-style nondeterminism concerns is irrelevant here (browser)
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${keyPrefix}${rand}.${ext}`;

  const sb = getSupabaseBrowser();
  const { error } = await sb.storage.from(bucket).upload(path, compressed, {
    upsert: true,
    contentType: compressed.type || (toWebp ? "image/webp" : "image/jpeg"),
  });
  if (error) throw error;

  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
