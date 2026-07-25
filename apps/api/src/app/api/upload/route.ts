import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { getCurrentUserId } from "@/lib/user";

const IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);
const AUDIO_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/webm",
  "audio/x-m4a",
]);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// Auto-detect: if BLOB_READ_WRITE_TOKEN is configured (e.g. on Vercel), use
// Vercel Blob. Otherwise fall back to writing under public/uploads/ (works for
// local dev + self-hosted disk-backed deployments).
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();

    const form = await req.formData();
    const raw = form.get("file");

    if (
      !raw ||
      typeof raw === "string" ||
      typeof (raw as Blob).arrayBuffer !== "function"
    ) {
      return NextResponse.json({ error: "No file provided (field 'file')" }, { status: 400 });
    }
    const file = raw as Blob & { name?: string };
    const type = file.type || "application/octet-stream";
    const size = file.size ?? 0;
    const name = file.name ?? "upload.bin";

    const isImage = IMAGE_MIME.has(type);
    const isAudio = AUDIO_MIME.has(type) || looksLikeAudio(name, type);
    if (!isImage && !isAudio) {
      return NextResponse.json(
        {
          error:
            `Unsupported type ${type}. Allowed: images (PNG/JPEG/WebP/GIF/SVG) ` +
            `or audio (MP3/M4A/AAC/OGG/WAV/WebM).`,
        },
        { status: 400 },
      );
    }

    const maxBytes = isAudio ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;
    if (size > maxBytes) {
      return NextResponse.json(
        {
          error: `File too large (${(size / 1024 / 1024).toFixed(1)} MB). Max ${
            isAudio ? 15 : 4
          } MB.`,
        },
        { status: 400 },
      );
    }

    const contentType = isAudio && type === "application/octet-stream"
      ? mimeFromName(name)
      : type;
    const ext = extFor(contentType, name);
    const filename = `${userId.slice(-6)}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}${ext}`;

    if (useBlob) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`uploads/${filename}`, file, {
        access: "public",
        contentType,
        addRandomSuffix: false,
      });
      return NextResponse.json({
        url: blob.url,
        bytes: size,
        contentType,
        backend: "blob",
      });
    }

    // Vercel's serverless filesystem is read-only outside /tmp; the disk
    // fallback below would 500 there. Fail fast with an actionable hint.
    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            "Vercel Blob is not configured. Set BLOB_READ_WRITE_TOKEN: " +
            "Project → Storage → Connect Blob → redeploy.",
        },
        { status: 503 },
      );
    }

    if (!existsSync(UPLOADS_DIR)) {
      await mkdir(UPLOADS_DIR, { recursive: true });
    }
    const dest = path.join(UPLOADS_DIR, filename);
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(dest, buf);

    return NextResponse.json({
      url: `${new URL(req.url).origin}/uploads/${filename}`,
      bytes: buf.length,
      contentType,
      backend: "disk",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/upload] failed:", msg);
    return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 500 });
  }
}

function looksLikeAudio(name: string, type: string) {
  if (type.startsWith("audio/")) return true;
  return /\.(mp3|m4a|aac|ogg|wav|webm)$/i.test(name);
}

function mimeFromName(name: string): string {
  const ext = path.extname(name).toLowerCase();
  switch (ext) {
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".aac":
      return "audio/aac";
    case ".ogg":
      return "audio/ogg";
    case ".wav":
      return "audio/wav";
    case ".webm":
      return "audio/webm";
    default:
      return "audio/mpeg";
  }
}

function extFor(mime: string, originalName: string): string {
  const fromName = path.extname(originalName).toLowerCase();
  if (fromName) return fromName;
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/svg+xml":
      return ".svg";
    case "audio/mpeg":
    case "audio/mp3":
      return ".mp3";
    case "audio/mp4":
    case "audio/x-m4a":
      return ".m4a";
    case "audio/aac":
      return ".aac";
    case "audio/ogg":
      return ".ogg";
    case "audio/wav":
    case "audio/x-wav":
    case "audio/wave":
      return ".wav";
    case "audio/webm":
      return ".webm";
    default:
      return "";
  }
}
