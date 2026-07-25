"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, LayoutGrid, Mail, Bell, Zap, Backpack, CalendarDays } from "lucide-react";
import { useUser, useResin } from "@/hooks/queries";
import { cn } from "@/lib/utils";
import { AvatarFrame } from "@/components/avatar-frame";

/**
 * Top nav — floating split islands over the scenic wallpaper:
 * — Left: logo plaque
 * — Right: nav + resin / inventory / profile
 * — Center gap lets the page background show through
 */
const NAV = [
  { href: "/",         cn: "首页",   en: "Home",        icon: Home },
  { href: "/system",   cn: "系统",   en: "System",      icon: LayoutGrid },
  { href: "/achievements", cn: "成就", en: "Achievement", icon: Trophy },
  { href: "/routines", cn: "日程",   en: "Schedule",    icon: CalendarDays },
] as const;

const islandShell =
  "pointer-events-auto relative rounded-2xl border border-[#d8c593]/40 shadow-[0_14px_36px_-18px_rgba(4,12,24,0.88),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl";

export function TopNav() {
  const path = usePathname();
  const { data: user } = useUser();
  const { data: resin } = useResin();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="pointer-events-none sticky top-0 z-30">
      <div className="mx-auto flex max-w-[2048px] items-start justify-between gap-2 px-3 pt-3 pb-2 sm:gap-3 sm:px-4 md:gap-5 md:px-6 md:pt-4 md:pb-3">
        {/* Left island — logo */}
        <Link
          href="/"
          className={cn(
            islandShell,
            "top-nav-logo-island flex shrink-0 items-center gap-2.5 px-2.5 py-2 sm:gap-3 sm:px-3.5 sm:py-2.5",
          )}
        >
          <div className="text-[var(--gold-deep)] drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">
            <CompassStar size={44} />
          </div>
          <div className="hidden min-w-0 pr-1 md:block">
            <div className="font-display text-[20px] font-bold tracking-[0.06em] text-[#554c40] lg:text-[24px]">
              Game Life
            </div>
            <div className="hidden font-display-en text-[9px] tracking-[0.22em] text-[#8a7d68]/90 xl:block">
              Life OS
            </div>
          </div>
        </Link>

        {/* Right island — function area */}
        <div
          className={cn(
            islandShell,
            "top-nav-func-island flex min-w-0 max-w-full items-center gap-1.5 px-1.5 py-1.5 sm:gap-2 sm:px-2.5 sm:py-2 md:gap-3 md:px-3",
          )}
        >
          <nav className="flex min-w-0 items-stretch">
            <div className="relative flex items-stretch gap-0.5 sm:gap-1">
              {NAV.map(({ href, cn: zh, en, icon: Icon }) => {
                const active =
                  href === "/"
                    ? path === "/"
                    : path.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={`${zh} · ${en}`}
                    className={cn(
                      "group relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 transition-all sm:min-h-[48px] sm:px-2.5 lg:min-w-[84px] lg:px-3.5",
                      active
                        ? "nav-plaque text-[var(--fg-strong)]"
                        : "text-[#e6d9b8]/80 hover:text-[#fff3ce]",
                    )}
                  >
                    {active && (
                      <>
                        <div className="pointer-events-none absolute inset-1 border border-[var(--gold)]/40" />
                        <div className="pointer-events-none absolute left-1/2 top-1 h-1 w-8 -translate-x-1/2 bg-[var(--gold)]/55" />
                      </>
                    )}
                    <Icon
                      size={17}
                      className={cn(
                        "relative shrink-0",
                        active ? "text-[var(--gold-deep)]" : "text-[#e8d9a8]",
                      )}
                    />
                    <div className="relative hidden flex-col items-center leading-tight lg:flex">
                      <span
                        className={cn(
                          "font-display text-[12px] font-semibold tracking-[0.1em] xl:text-[13px]",
                          active ? "text-[var(--fg-strong)]" : "text-[#f4e8c8]",
                        )}
                      >
                        {zh}
                      </span>
                      <span
                        className={cn(
                          "hidden font-display-en text-[8px] xl:inline",
                          active ? "text-[var(--gold-deep)]/80" : "text-[#cabd99]/80",
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

          <div className="mx-0.5 hidden h-8 w-px shrink-0 bg-gradient-to-b from-transparent via-[#d8c593]/45 to-transparent sm:block" />

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {mounted && resin && (
              <div
                className="hidden items-center gap-1.5 rounded-full border border-[#d8c593]/30 bg-white/10 px-2.5 py-1.5 text-[#f4e8c8] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md md:flex"
                title={
                  resin.isFull
                    ? "精力已满"
                    : `精力 ${resin.current}/${resin.max} · 下次回 +1 还需 ${formatMs(resin.msToNextRegen ?? 0)} · 满需 ${formatMs(resin.msToFull ?? 0)}`
                }
              >
                <Zap
                  size={14}
                  className={resin.isFull ? "text-[var(--gold)]" : "text-[var(--gold-deep)]"}
                  fill={resin.isFull ? "currentColor" : "none"}
                />
                <span className="font-mono text-[12px] font-bold text-[#fff3ce]">
                  {resin.current}
                  <span className="text-[10px] text-[#cabd99]">/{resin.max}</span>
                </span>
              </div>
            )}
            <Link
              href="/inventory"
              className={cn(
                "hidden h-9 w-9 place-items-center rounded-full border bg-white/10 backdrop-blur-md transition-colors sm:grid md:h-10 md:w-10",
                path.startsWith("/inventory")
                  ? "border-[var(--gold)] text-[var(--gold-pale)]"
                  : "border-[#d8c593]/30 text-[#e8d9a8] hover:border-[var(--gold)] hover:text-[var(--gold-pale)]",
              )}
              title="背包"
            >
              <Backpack size={16} />
            </Link>
            <div className="hidden 2xl:block">
              <InboxButton />
            </div>
            <div className="hidden 2xl:block">
              <NotificationsButton />
            </div>
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-full border border-[#d8c593]/30 bg-white/10 py-0.5 pl-0.5 pr-0.5 text-[#f4e8c8] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition-colors hover:border-[var(--gold)] sm:pr-1 lg:pr-3"
              style={
                mounted && user?.equippedFrame?.style.glow
                  ? { color: user.equippedFrame.style.glow }
                  : undefined
              }
            >
              {mounted && user ? (
                <AvatarFrame
                  size={30}
                  src={user.avatarUrl || undefined}
                  style={user.equippedFrame?.style ?? null}
                  alt={user.name ?? "avatar"}
                />
              ) : (
                <div className="h-8 w-8 shrink-0 rounded-full border border-[var(--gold)]/70 bg-[var(--gold-tint)]" />
              )}
              <div className="hidden text-left leading-tight lg:block">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-[13px] font-semibold text-[#fff3ce]">
                    {mounted ? (user?.name ?? "Player") : "Player"}
                  </span>
                  {mounted && user?.equippedTitle && (
                    <span
                      className="hidden rounded-sm bg-[var(--gold-tint)] px-1 font-display text-[10px] font-semibold text-[var(--gold-deep)] xl:inline"
                      title={user.equippedTitle.name}
                    >
                      {user.equippedTitle.emoji} {user.equippedTitle.name}
                    </span>
                  )}
                </div>
                <div className="font-display-en text-[9px] tracking-[0.18em] text-[#cabd99]">
                  Lv.{mounted ? (user?.level ?? 1) : 1}
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function formatMs(ms: number): string {
  if (ms <= 0) return "0s";
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function InboxButton() {
  const [open, setOpen] = useState(false);
  const ref = useDismissOnOutside(() => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-full border border-[#d8c593]/30 bg-white/10 text-[#e8d9a8] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition-colors hover:border-[var(--gold)] hover:text-[var(--gold-pale)]"
        title="信箱"
      >
        <Mail size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-30 w-64 rounded-sm border border-white/40 bg-[rgba(255,251,240,0.92)] p-3 shadow-[0_18px_42px_-24px_rgba(7,20,36,0.58)] backdrop-blur-xl"
        >
          <div className="font-display text-[12px] font-semibold text-[var(--fg-strong)]">信箱 · Inbox</div>
          <div className="mt-1 text-[11px] text-[var(--fg-subtle)]">暂无新邮件。</div>
          <div className="mt-2 border-t border-[var(--border)] pt-2 text-[10px] text-[var(--fg-subtle)]">
            活动奖励 / 系统消息将在这里送达。
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const ref = useDismissOnOutside(() => setOpen(false));
  // No real notification source yet — keep the dot off until one exists.
  const hasUnread = false;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-[#d8c593]/30 bg-white/10 text-[#e8d9a8] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition-colors hover:border-[var(--gold)] hover:text-[var(--gold-pale)]"
        title="通知"
      >
        <Bell size={16} />
        {hasUnread && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--danger)] shadow-[0_0_0_2px_var(--bg-card)]" />
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-30 w-64 rounded-sm border border-white/40 bg-[rgba(255,251,240,0.92)] p-3 shadow-[0_18px_42px_-24px_rgba(7,20,36,0.58)] backdrop-blur-xl"
        >
          <div className="font-display text-[12px] font-semibold text-[var(--fg-strong)]">通知 · Notifications</div>
          <div className="mt-1 text-[11px] text-[var(--fg-subtle)]">暂无新通知。</div>
          <div className="mt-2 border-t border-[var(--border)] pt-2 text-[10px] text-[var(--fg-subtle)]">
            升级 / 解锁成就 / 限时活动提醒会出现在此。
          </div>
        </div>
      )}
    </div>
  );
}

function useDismissOnOutside(onDismiss: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onDismiss]);
  return ref;
}

function CompassStar({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
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
