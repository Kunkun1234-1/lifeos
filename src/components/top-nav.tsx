"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, HelpCircle, LayoutGrid, Mail, Bell, Zap, Backpack, CalendarDays } from "lucide-react";
import { useUser, useResin } from "@/hooks/queries";
import { cn } from "@/lib/utils";
import { AvatarFrame } from "@/components/avatar-frame";

/**
 * Top nav — matches the final reference mock:
 * — Logo left
 * — Center nav (5 buttons; active = deep-ink pill with curtain trim)
 * — Right: mail + bell (with dot) + avatar pill
 */
const NAV = [
  { href: "/",         cn: "首页",   en: "Home",        icon: Home },
  { href: "/system",   cn: "系统",   en: "System",      icon: LayoutGrid },
  { href: "/achievements", cn: "成就", en: "Achievement", icon: Trophy },
  { href: "/routines", cn: "日程",   en: "Schedule",    icon: CalendarDays },
  { href: "/help",     cn: "帮助",   en: "Help",        icon: HelpCircle },
] as const;

export function TopNav() {
  const path = usePathname();
  const { data: user } = useUser();
  const { data: resin } = useResin();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-30 h-[82px] border-b border-[#d8c593]/30 bg-[#172437] shadow-[0_18px_36px_-28px_rgba(4,12,24,0.95)]">
      <div className="top-brand-panel" />
      <div className="pointer-events-none absolute inset-y-0 left-[24%] w-1/2 bg-gradient-to-r from-white/10 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/70 to-transparent" />

      <div className="relative mx-auto flex h-full max-w-[2048px] items-center gap-3 px-4 md:gap-6 md:px-7">
        {/* Logo */}
        <Link href="/" className="z-10 flex w-[72px] shrink-0 items-center gap-3 md:w-[180px] lg:w-[250px] xl:w-[300px] 2xl:w-[360px]">
          <div className="text-[var(--gold-deep)] drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">
            <CompassStar size={52} />
          </div>
          <div className="hidden lg:block">
            <div className="font-display text-[24px] font-bold tracking-[0.08em] text-[#554c40] xl:text-[28px]">
              人生管理系统
            </div>
            <div className="font-display-en text-[11px] tracking-[0.24em] text-[var(--gold-deep)]">
              LIFE MANAGEMENT SYSTEM
            </div>
          </div>
        </Link>

        {/* Center nav — banner plaque */}
        <nav className="relative flex flex-1 items-center justify-start md:justify-center">
          <div className="relative flex items-stretch gap-2 rounded-sm">
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
                    "group relative flex min-h-[54px] flex-col items-center justify-center gap-0.5 px-2 py-2 transition-all sm:px-3 lg:min-w-[92px] lg:px-4",
                    active
                      ? "nav-plaque text-[var(--fg-strong)]"
                      : "text-[#e6d9b8]/80 hover:text-[#fff3ce]"
                  )}
                >
                  {active && (
                    <>
                      <div className="pointer-events-none absolute inset-1 border border-[var(--gold)]/40" />
                      <div className="pointer-events-none absolute left-1/2 top-1 h-1 w-8 -translate-x-1/2 bg-[var(--gold)]/55" />
                    </>
                  )}
                  <Icon
                    size={18}
                    className={cn(
                      "relative shrink-0",
                      active ? "text-[var(--gold-deep)]" : "text-[#e8d9a8]"
                    )}
                  />
                  <div className="relative hidden flex-col items-center leading-tight lg:flex">
                    <span
                      className={cn(
                        "font-display text-[13px] font-semibold tracking-[0.1em]",
                        active ? "text-[var(--fg-strong)]" : "text-[#f4e8c8]"
                      )}
                    >
                      {zh}
                    </span>
                    <span
                      className={cn(
                        "hidden font-display-en text-[8px] xl:inline",
                        active ? "text-[var(--gold-deep)]/80" : "text-[#cabd99]/80"
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

        {/* Right: resin + mail + bell + avatar */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          {mounted && resin && (
            <div
              className="hidden items-center gap-1.5 rounded-full border border-[#d8c593]/30 bg-white/10 px-3 py-1.5 text-[#f4e8c8] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md md:flex"
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
              "hidden h-10 w-10 place-items-center rounded-full border bg-white/10 backdrop-blur-md transition-colors md:grid",
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
            className="flex items-center gap-2.5 rounded-full border border-[#d8c593]/30 bg-white/10 py-1 pl-1 pr-1 text-[#f4e8c8] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition-colors hover:border-[var(--gold)] lg:pr-3"
            style={
              mounted && user?.equippedFrame?.style.glow
                ? { color: user.equippedFrame.style.glow }
                : undefined
            }
          >
            {mounted && user ? (
              <AvatarFrame
                size={32}
                src={user.avatarUrl || undefined}
                style={user.equippedFrame?.style ?? null}
                alt={user.name ?? "avatar"}
              />
            ) : (
              <div className="h-9 w-9 shrink-0 rounded-full border border-[var(--gold)]/70 bg-[var(--gold-tint)]" />
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
