import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { getCurrentUserId } from "@/lib/user";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
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

    if (!ALLOWED_MIME.has(type)) {
      return NextResponse.json(
        { error: `Unsupported type ${type}. Allowed: PNG, JPEG, WebP, GIF, SVG.` },
        { status: 400 },
      );
    }

    if (size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (${(size / 1024 / 1024).toFixed(1)} MB). Max 4 MB.` },
        { status: 400 },
      );
    }

    const ext = extFor(type, name);
    const filename = `${userId.slice(-6)}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}${ext}`;

    if (useBlob) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`uploads/${filename}`, file, {
        access: "public",
        contentType: type,
        addRandomSuffix: false,
      });
      return NextResponse.json({
        url: blob.url,
        bytes: size,
        contentType: type,
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
      url: `/uploads/${filename}`,
      bytes: buf.length,
      contentType: type,
      backend: "disk",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/upload] failed:", msg);
    return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 500 });
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
    default:
      return "";
  }
}
