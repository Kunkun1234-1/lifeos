"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Settings as SettingsIcon, HelpCircle, LayoutGrid, Mail, Bell } from "lucide-react";
import { useUser } from "@/hooks/queries";
import { cn } from "@/lib/utils";

/**
 * Top nav — matches the final reference mock:
 * — Logo left
 * — Center nav (5 buttons; active = deep-ink pill with curtain trim)
 * — Right: mail + bell (with dot) + avatar pill
 */
const NAV = [
  { href: "/",         cn: "首页",   en: "Home",        icon: Home },
  { href: "/system",   cn: "系统",   en: "System",      icon: LayoutGrid },
  { href: "/review",   cn: "成就",   en: "Achievement", icon: Trophy },
  { href: "/settings", cn: "设置",   en: "Setting",     icon: SettingsIcon },
  { href: "/help",     cn: "帮助",   en: "Help",        icon: HelpCircle },
] as const;

export function TopNav() {
  const path = usePathname();
  const { data: user } = useUser();

  return (
    <header className="relative z-20 border-b border-[var(--border)]/70 bg-[var(--bg-page)]/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/50 to-transparent" />

      <div className="mx-auto flex h-[74px] max-w-[1536px] items-center gap-6 px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="text-[var(--gold-deep)]">
            <CompassStar size={44} />
          </div>
          <div>
            <div className="font-display text-[20px] font-bold tracking-[0.14em] text-[var(--fg-strong)]">
              人生管理系统
            </div>
            <div className="font-display-en text-[9px] tracking-[0.25em] text-[var(--gold-deep)]">
              LIFE MANAGEMENT SYSTEM
            </div>
          </div>
        </Link>

        {/* Center nav — banner plaque */}
        <nav className="relative flex flex-1 items-center justify-center">
          <div className="relative flex items-stretch gap-1 rounded-sm">
            {NAV.map(({ href, cn: zh, en, icon: Icon }) => {
              const active =
                href === "/"
                  ? path === "/"
                  : path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group relative flex min-w-[86px] flex-col items-center gap-0.5 px-4 py-2 transition-all",
                    active ? "" : "opacity-80 hover:opacity-100"
                  )}
                >
                  {active && (
                    <>
                      {/* Deep-ink pill */}
                      <div className="pointer-events-none absolute inset-0 rounded-sm bg-gradient-to-b from-[#2a3648] to-[#1e2938] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_12px_-4px_rgba(26,34,48,0.5)]" />
                      {/* Gold hairline inner frame */}
                      <div className="pointer-events-none absolute inset-0.5 rounded-sm border border-[var(--gold)]/60" />
                      {/* Curtain trim (decorative top) */}
                      <div className="pointer-events-none absolute -top-1 left-1/2 h-2 w-8 -translate-x-1/2 rounded-b-full bg-[var(--gold)]/70" />
                    </>
                  )}
                  <Icon
                    size={18}
                    className={cn(
                      "relative shrink-0",
                      active ? "text-[var(--gold-pale)]" : "text-[var(--fg-muted)]"
                    )}
                  />
                  <div className="relative flex flex-col items-center leading-tight">
                    <span
                      className={cn(
                        "font-display text-[13px] font-semibold tracking-[0.1em]",
                        active ? "text-[var(--fg-on-ink)]" : "text-[var(--fg-strong)]"
                      )}
                    >
                      {zh}
                    </span>
                    <span
                      className={cn(
                        "font-display-en text-[8px]",
                        active ? "text-[var(--gold-pale)]/80" : "text-[var(--fg-subtle)]"
                      )}
                    >
                      {en}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Right: mail + bell + avatar */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-card)]/70 text-[var(--fg-muted)] transition-colors hover:border-[var(--gold)] hover:text-[var(--gold-deep)]"
            title="信箱"
          >
            <Mail size={16} />
          </button>
          <button
            className="relative grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-card)]/70 text-[var(--fg-muted)] transition-colors hover:border-[var(--gold)] hover:text-[var(--gold-deep)]"
            title="通知"
          >
            <Bell size={16} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--danger)] shadow-[0_0_0_2px_var(--bg-card)]" />
          </button>
          <Link href="/settings" className="flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)]/70 pr-3 pl-1 py-1 transition-colors hover:border-[var(--gold)]">
            <div className="relative h-9 w-9 overflow-hidden rounded-full border border-[var(--gold)] shadow-[0_0_0_2px_var(--bg-card)]">
              <Image
                src="/lifeos/profile_avatar.png"
                alt="avatar"
                width={36}
                height={36}
                className="object-cover"
                priority
              />
            </div>
            <div className="text-left leading-tight">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[13px] font-semibold text-[var(--fg-strong)]">
                  {user?.name ?? "Player"}
                </span>
                {user?.equippedTitle && (
                  <span
                    className="rounded-sm bg-[var(--gold-tint)] px-1 font-display text-[10px] font-semibold text-[var(--gold-deep)]"
                    title={user.equippedTitle.name}
                  >
                    {user.equippedTitle.emoji} {user.equippedTitle.name}
                  </span>
                )}
              </div>
              <div className="font-display-en text-[9px] tracking-[0.18em] text-[var(--gold-deep)]">
                Lv.{user?.level ?? 1}
              </div>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}

function CompassStar({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      {/* 8-point star */}
      <path
        d="M24 3 L26.5 21.5 L45 24 L26.5 26.5 L24 45 L21.5 26.5 L3 24 L21.5 21.5 Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M35.5 12.5 L25 23 L35.5 35.5 L24 25 L12.5 35.5 L23 25 L12.5 12.5 L24 23 Z"
        fill="currentColor"
        opacity="0.35"
      />
      <circle cx="24" cy="24" r="2.2" fill="currentColor" />
    </svg>
  );
}
