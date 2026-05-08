"use client";

import Image from "next/image";
import { useUser } from "@/hooks/queries";
import { Sun } from "lucide-react";

/**
 * Center hero scene — FULL-BLEED character illustration (no frame).
 * Top-right overlay: YEAR 18 · 18岁 large · date with sun icon.
 * Left overlay: bilingual motto quote.
 */
export function HeroScene() {
  const { data: user } = useUser();
  const birthday = user?.birthday ? new Date(user.birthday) : null;
  const age = birthday ? deriveAge(birthday) : null;
  const date = new Date().toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
  const weekday = new Date().toLocaleDateString("zh-CN", { weekday: "long" });

  return (
    <section className="relative h-[480px] overflow-hidden rounded-sm">
      <Image
        src="/lifeos/main_character_scene.png"
        alt="Hero scene"
        fill
        className="object-cover object-center"
        priority
        sizes="(min-width: 1280px) 760px, 100vw"
        suppressHydrationWarning
      />

      {/* Soft bottom gradient for readability */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1a2234]/25 to-transparent" />
      {/* Top gradient to soften the chip */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[#f4ecd9]/50 via-[#f4ecd9]/10 to-transparent" />

      {/* Top-right age / date overlay */}
      <div
        className="absolute right-8 top-6 z-10 text-right"
        suppressHydrationWarning
      >
        {age !== null ? (
          <>
            <div className="flex items-baseline justify-end gap-2">
              <span className="font-display-en text-[11px] tracking-[0.3em] text-[var(--fg-strong)]/60">
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
      <div className="absolute left-6 top-36 z-10 max-w-[260px] space-y-2">
        <div
          className="font-display text-[16px] font-semibold leading-relaxed text-[var(--fg-strong)]"
          style={{ textShadow: "0 2px 12px rgba(252,247,234,0.8)" }}
        >
          {user?.visionStatement ? (
            user.visionStatement
          ) : (
            <>
              每一次选择，
              <br />
              都会导向不同的风景。
            </>
          )}
        </div>
        <div className="font-display-en text-[10px] italic leading-relaxed text-[var(--fg-muted)]">
          Every choice leads to a
          <br />
          different landscape.
        </div>
      </div>
    </section>
  );
}

function deriveAge(birthday: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthday.getFullYear();
  const m = now.getMonth() - birthday.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthday.getDate())) age -= 1;
  return Math.max(0, age);
}
