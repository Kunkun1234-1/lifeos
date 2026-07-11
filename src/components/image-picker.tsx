"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { api } from "@/lib/fetcher";

/**
 * Reusable image upload widget.
 * Posts to /api/upload and surfaces the returned URL via onChange.
 * Falls back to showing the supplied emoji/placeholder when no image is set.
 */
export function ImagePicker({
  value,
  onChange,
  fallbackEmoji = "📷",
  size = 64,
  label = "上传图片",
  hint = "PNG / JPG / WebP / GIF / SVG · ≤ 4 MB",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  fallbackEmoji?: string;
  size?: number;
  label?: string;
  hint?: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setErr(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { url } = await api<{ url: string }>("/api/upload", {
        method: "POST",
        body: form,
        backend: true,
      });
      onChange(url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative shrink-0 overflow-hidden rounded-sm border border-[var(--border-strong)] bg-[var(--bg-card)]"
        style={{ width: size, height: size }}
      >
        {value ? (
          <Image src={value} alt="preview" fill sizes={`${size}px`} className="object-cover" unoptimized />
        ) : (
          <div className="grid h-full w-full place-items-center text-2xl">{fallbackEmoji}</div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-raised)] px-2 py-1 text-[11px] font-medium text-[var(--fg)] hover:border-[var(--gold)] disabled:opacity-50"
          >
            <Upload size={12} /> {busy ? "上传中…" : label}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-sm border border-transparent px-2 py-1 text-[11px] text-[var(--fg-muted)] hover:text-[var(--danger)]"
              title="移除"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="text-[9px] text-[var(--fg-subtle)]">{hint}</div>
        {err && <div className="text-[10px] text-[var(--danger)]">{err}</div>}
      </div>
    </div>
  );
}
