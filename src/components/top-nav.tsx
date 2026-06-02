"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Settings as SettingsIcon, HelpCircle, LayoutGrid, Mail, Bell, Zap, Backpack } from "lucide-react";
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
  { href: "/settings", cn: "设置",   en: "Setting",     icon: SettingsIcon },
  { href: "/help",     cn: "帮助",   en: "Help",        icon: HelpCircle },
] as const;

export function TopNav() {
  const path = usePathname();
  const { data: user } = useUser();
  const { data: resin } = useResin();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="relative z-20 border-b border-[var(--border)]/70 bg-[var(--bg-page)]/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/50 to-transparent" />

      <div className="mx-auto flex h-[74px] max-w-[1536px] items-center gap-3 px-4 md:gap-6 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="text-[var(--gold-deep)]">
            <CompassStar size={44} />
          </div>
          <div className="hidden lg:block">
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
                  title={`${zh} · ${en}`}
                  className={cn(
                    "group relative flex flex-col items-center gap-0.5 px-2 py-2 transition-all sm:px-3 lg:min-w-[86px] lg:px-4",
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
                  <div className="relative hidden flex-col items-center leading-tight lg:flex">
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
                        "hidden font-display-en text-[8px] xl:inline",
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

        {/* Right: resin + mail + bell + avatar */}
        <div className="flex shrink-0 items-center gap-3">
          {mounted && resin && (
            <div
              className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)]/70 px-3 py-1.5 text-[var(--fg-muted)] md:flex"
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
              <span className="font-mono text-[12px] font-bold text-[var(--fg-strong)]">
                {resin.current}
                <span className="text-[10px] text-[var(--fg-muted)]">/{resin.max}</span>
              </span>
            </div>
          )}
          <Link
            href="/inventory"
            className={cn(
              "hidden h-10 w-10 place-items-center rounded-full border bg-[var(--bg-card)]/70 transition-colors md:grid",
              path.startsWith("/inventory")
                ? "border-[var(--gold)] text-[var(--gold-deep)]"
                : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--gold)] hover:text-[var(--gold-deep)]",
            )}
            title="背包"
          >
            <Backpack size={16} />
          </Link>
          <div className="hidden md:block">
            <InboxButton />
          </div>
          <div className="hidden md:block">
            <NotificationsButton />
          </div>
          <Link
            href="/settings"
            className="flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)]/70 py-1 pl-1 pr-1 transition-colors hover:border-[var(--gold)] lg:pr-3"
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
                <span className="font-display text-[13px] font-semibold text-[var(--fg-strong)]">
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
              <div className="font-display-en text-[9px] tracking-[0.18em] text-[var(--gold-deep)]">
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
        className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-card)]/70 text-[var(--fg-muted)] transition-colors hover:border-[var(--gold)] hover:text-[var(--gold-deep)]"
        title="信箱"
      >
        <Mail size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-30 w-64 rounded-sm border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[0_8px_24px_-12px_rgba(26,34,48,0.4)]"
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
        className="relative grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-card)]/70 text-[var(--fg-muted)] transition-colors hover:border-[var(--gold)] hover:text-[var(--gold-deep)]"
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
          className="absolute right-0 top-12 z-30 w-64 rounded-sm border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[0_8px_24px_-12px_rgba(26,34,48,0.4)]"
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
