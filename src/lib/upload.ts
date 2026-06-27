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
): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
  });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  // avoid Date.now()-style nondeterminism concerns is irrelevant here (browser)
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${keyPrefix}${rand}.${ext}`;

  const sb = getSupabaseBrowser();
  const { error } = await sb.storage.from(bucket).upload(path, compressed, {
    upsert: true,
    contentType: compressed.type || "image/jpeg",
  });
  if (error) throw error;

  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
