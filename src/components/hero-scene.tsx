"use client";

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useDashboardData } from "@/components/dashboard-data";
import { useUpdateUser, useUser } from "@/hooks/queries";
import { ArrowRight, Check, Loader2, Pencil, Sun, X } from "lucide-react";

const DEFAULT_VISION = "每一次选择，\n都会导向不同的风景。";

/**
 * Center hero scene — wallpaper-led, full-bleed scene.
 * Top-right overlay: YEAR 18 · 18岁 large · date with sun icon.
 * Left overlay: bilingual motto quote.
 */
export function HeroScene() {
  const dashboard = useDashboardData();
  const { data: queryUser } = useUser({ enabled: !dashboard.active });
  const updateUser = useUpdateUser();
  const user = dashboard.data?.user ?? queryUser;
  const remoteVision = user?.visionStatement ?? null;
  const [optimisticVision, setOptimisticVision] = useState<string | null | undefined>();
  const [isEditingVision, setIsEditingVision] = useState(false);
  const [visionDraft, setVisionDraft] = useState(DEFAULT_VISION);
  const [visionError, setVisionError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editBaselineRef = useRef(DEFAULT_VISION);
  const currentVision = optimisticVision !== undefined ? optimisticVision : remoteVision;
  const displayVision = currentVision?.trim() ? currentVision : DEFAULT_VISION;
  const birthday = user?.birthday ? new Date(user.birthday) : null;
  const age = birthday ? deriveAge(birthday) : null;
  const date = new Date().toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
  const weekday = new Date().toLocaleDateString("zh-CN", { weekday: "long" });

  useEffect(() => {
    if (optimisticVision !== undefined && optimisticVision === remoteVision) {
      setOptimisticVision(undefined);
    }
  }, [optimisticVision, remoteVision]);

  useEffect(() => {
    if (!isEditingVision) {
      setVisionDraft(displayVision);
    }
  }, [displayVision, isEditingVision]);

  useEffect(() => {
    if (!isEditingVision) return;

    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isEditingVision]);

  const startVisionEdit = () => {
    editBaselineRef.current = displayVision;
    setVisionDraft(displayVision);
    setVisionError(null);
    setIsEditingVision(true);
  };

  const cancelVisionEdit = () => {
    setVisionDraft(editBaselineRef.current);
    setVisionError(null);
    setIsEditingVision(false);
  };

  const saveVisionDraft = async () => {
    if (updateUser.isPending) return;

    const next = visionDraft.trim();
    if (next === editBaselineRef.current.trim()) {
      setVisionError(null);
      setIsEditingVision(false);
      return;
    }

    try {
      await updateUser.mutateAsync({ visionStatement: next || null });
      setOptimisticVision(next || null);
      setVisionError(null);
      setIsEditingVision(false);
      editBaselineRef.current = next || DEFAULT_VISION;
    } catch (error) {
      setVisionError((error as Error).message || "保存失败，请稍后重试");
    }
  };

  const handleEditorBlur = (event: FocusEvent<HTMLFormElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    void saveVisionDraft();
  };

  const handleDisplayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      startVisionEdit();
    }
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelVisionEdit();
      return;
    }

    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void saveVisionDraft();
    }
  };

  return (
    <section className="group relative h-[520px] min-h-[520px] overflow-hidden rounded-sm border border-white/30 shadow-[0_30px_70px_-40px_rgba(5,18,36,0.85)] xl:h-full xl:min-h-[460px] 2xl:min-h-[640px]">
      <Image
        src="/lifeos/background-wallpaper.png"
        alt="Hero scene"
        fill
        className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.025]"
        priority
        sizes="(min-width: 1536px) 1040px, (min-width: 1280px) 760px, 100vw"
        suppressHydrationWarning
      />

      {/* Soft bottom gradient for readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#07172a]/26 via-transparent to-[#07172a]/10" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07172a]/30 via-transparent to-white/10" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/25" />

      {/* Top-right age / date overlay */}
      <div
        className="absolute right-5 top-5 z-10 rounded-sm border border-white/40 bg-white/55 px-4 py-3 text-right shadow-[0_18px_32px_-24px_rgba(5,18,36,0.8)] backdrop-blur-md sm:right-8 sm:top-6"
        suppressHydrationWarning
      >
        {age !== null ? (
          <>
            <div className="flex items-baseline justify-end gap-2">
              <span className="font-display-en text-[11px] tracking-[0.3em] text-[#31506d]/70">
                YEAR
              </span>
              <span className="font-display text-[14px] font-bold text-[var(--fg-strong)]">
                {age}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-end gap-3">
              <div
                className="font-display text-[64px] font-bold leading-none text-[var(--fg-strong)]"
                style={{ textShadow: "0 2px 20px rgba(252,247,234,0.6)" }}
                suppressHydrationWarning
              >
                {age}岁
              </div>
            </div>
          </>
        ) : (
          <a
            href="/settings"
            className="block font-display-en text-[11px] tracking-[0.3em] text-[var(--gold-deep)] underline-offset-2 hover:underline"
          >
            设置生日 → SET BIRTHDAY
          </a>
        )}
        <div className="mt-1 flex items-center justify-end gap-1.5 text-[var(--fg-strong)]">
          <span className="font-mono text-[13px]" suppressHydrationWarning>{date}</span>
          <Sun size={13} className="text-[var(--warning)]" />
          <span className="font-display text-[12px]" suppressHydrationWarning>{weekday}</span>
        </div>
      </div>

      {/* Left bilingual motto */}
      <div
        className="absolute bottom-6 left-5 z-10 max-w-[300px] border-l-2 border-[var(--gold)] bg-[rgba(255,251,240,0.78)] px-4 py-3 shadow-[0_20px_38px_-28px_rgba(5,18,36,0.75)] backdrop-blur-lg transition-all hover:-translate-y-0.5 hover:bg-[rgba(255,251,240,0.88)] hover:shadow-[0_24px_42px_-26px_rgba(5,18,36,0.85)] sm:left-6"
        onDoubleClick={startVisionEdit}
      >
        {isEditingVision ? (
          <form
            className="space-y-2"
            onBlur={handleEditorBlur}
            onSubmit={(event) => {
              event.preventDefault();
              void saveVisionDraft();
            }}
          >
            <textarea
              ref={textareaRef}
              value={visionDraft}
              onChange={(event) => setVisionDraft(event.target.value)}
              onKeyDown={handleDraftKeyDown}
              maxLength={1000}
              rows={3}
              className="min-h-[82px] w-full resize-none rounded-sm border border-[var(--gold)] bg-white/70 px-2 py-1.5 font-display text-[16px] font-semibold leading-relaxed text-[var(--fg-strong)] shadow-inner outline-none transition focus:border-[var(--gold-deep)] focus:bg-white/85 focus:ring-2 focus:ring-[var(--gold)]/25"
              aria-label="编辑主视觉标语"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="min-h-4 text-[10px] text-red-700">
                {visionError}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={cancelVisionEdit}
                  className="inline-flex size-7 items-center justify-center rounded-sm border border-[var(--border-strong)] bg-white/55 text-[var(--fg-muted)] transition hover:bg-white/80 hover:text-[var(--fg-strong)]"
                  aria-label="取消编辑"
                  title="取消编辑"
                >
                  <X size={14} />
                </button>
                <button
                  type="submit"
                  disabled={updateUser.isPending}
                  className="inline-flex size-7 items-center justify-center rounded-sm border border-[var(--gold)] bg-white/65 text-[var(--gold-deep)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="保存标语"
                  title="保存标语"
                >
                  {updateUser.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={handleDisplayKeyDown}
            className="group/quote cursor-text outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40"
            aria-label="双击编辑主视觉标语"
            title="双击编辑"
          >
            <Pencil
              size={14}
              className="absolute right-3 top-3 text-[var(--gold-deep)] opacity-0 transition group-hover/quote:opacity-80 group-focus-visible/quote:opacity-80"
              aria-hidden="true"
            />
            <div
              className="whitespace-pre-line pr-5 font-display text-[17px] font-semibold leading-relaxed text-[var(--fg-strong)]"
              style={{ textShadow: "0 2px 12px rgba(252,247,234,0.8)" }}
            >
              {displayVision}
            </div>
            <div className="mt-2 font-display-en text-[10px] italic leading-relaxed text-[var(--fg-muted)]">
              Every choice leads to a
              <br />
              different landscape.
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 right-5 z-10 hidden gap-2 sm:flex">
        <HeroAction href="/routines" label="今日安排" />
        <HeroAction href="/tasks" label="待办事项" />
      </div>
    </section>
  );
}

function HeroAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group/action inline-flex items-center gap-2 rounded-sm border border-white/40 bg-white/60 px-3 py-2 font-display text-[12px] font-semibold text-[var(--fg-strong)] shadow-[0_16px_28px_-22px_rgba(5,18,36,0.75)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[var(--gold)] hover:bg-white/75"
    >
      {label}
      <ArrowRight size={14} className="text-[var(--gold-deep)] transition-transform group-hover/action:translate-x-0.5" />
    </Link>
  );
}

function deriveAge(birthday: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthday.getFullYear();
  const m = now.getMonth() - birthday.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthday.getDate())) age -= 1;
  return Math.max(0, age);
}
