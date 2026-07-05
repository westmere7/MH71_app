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
  toWebp = true, // default to true
): Promise<string> {
  const options: any = {
    maxSizeMB: 0.2, // Aggressive limit: 200KB
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: "image/webp", // Enforce WebP globally
    initialQuality: 0.7, // Aggressive compression: 70% quality
  };
  const compressed = await imageCompression(file, options);

  const ext = "webp";
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${keyPrefix}${rand}.${ext}`;

  const sb = getSupabaseBrowser();
  const { error } = await sb.storage.from(bucket).upload(path, compressed, {
    upsert: true,
    contentType: "image/webp",
  });
  if (error) throw error;

  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage by its public URL.
 */
export async function deleteImage(
  bucket: "tenant-photos" | "meter-notes",
  url: string,
): Promise<void> {
  const parts = url.split(`/public/${bucket}/`);
  if (parts.length < 2) return;
  const path = parts[1];

  const sb = getSupabaseBrowser();
  const { error } = await sb.storage.from(bucket).remove([path]);
  if (error) {
    console.error("Failed to delete file from storage:", error.message);
  }
}
