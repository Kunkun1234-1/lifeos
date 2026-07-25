"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Backpack,
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Flag,
  Home,
  LayoutGrid,
  Mail,
  Medal,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";
import { useResin, useUpdateUser, useUser } from "@/hooks/queries";
import {
  applyThemeAccent,
  loadSettingsPrefs,
} from "@/lib/settings-prefs";
import { MusicPlayer } from "@/components/music-player";
import styles from "./life-game-shell.module.css";

const NAV_ITEMS = [
  { href: "/", label: "总览", icon: Home },
  { href: "/tasks", label: "任务计划", icon: CheckSquare2 },
  { href: "/routines", label: "日程规划", icon: CalendarDays },
  { href: "/goals", label: "人生目标", icon: Flag },
  { href: "/review", label: "成长反思", icon: BookOpen },
  { href: "/system", label: "角色成长", icon: LayoutGrid },
  { href: "/inventory", label: "物品背包", icon: Backpack },
  { href: "/achievements", label: "成就系统", icon: Medal },
  { href: "/assets", label: "财务资产", icon: CircleDollarSign },
  { href: "/settings", label: "系统设置", icon: Settings },
] as const;

const ROUTE_META = [
  { prefix: "/tasks", title: "任务计划", description: "整理今日任务，把每一步转化为成长进度。" },
  { prefix: "/routines", title: "日程规划", description: "安排节奏，让习惯和行动自然衔接。" },
  { prefix: "/goals", title: "人生目标", description: "确认前进方向，追踪每个阶段的里程碑。" },
  { prefix: "/review", title: "成长反思", description: "写下今日所得，沉淀成长与下一步。" },
  { prefix: "/inventory", title: "物品背包", description: "管理旅途中获得的物品与资源。" },
  { prefix: "/achievements", title: "成就系统", description: "回顾已经解锁的成长印记。" },
  { prefix: "/assets", title: "财务资产", description: "查看资产分布与近期变化。" },
  { prefix: "/settings", title: "系统设置", description: "调整属于你的冒险体验。" },
  { prefix: "/analytics", title: "成长分析", description: "从数据中观察长期成长趋势。" },
  { prefix: "/projects", title: "项目管理", description: "推进重要项目，串联任务与阶段成果。" },
  { prefix: "/rewards", title: "奖励商店", description: "用积累的成果兑换旅途奖励。" },
  { prefix: "/gacha", title: "祈愿", description: "开启一次属于你的旅途邂逅。" },
  { prefix: "/system", title: "角色成长", description: "查看角色状态与成长系统。" },
  { prefix: "/notes", title: "冒险笔记", description: "记录灵感、见闻与重要线索。" },
  { prefix: "/habits", title: "习惯养成", description: "稳定重复小行动，积累长期改变。" },
  { prefix: "/principles", title: "人生原则", description: "整理帮助你做出选择的准则。" },
  { prefix: "/decisions", title: "决策记录", description: "记录关键选择与背后的思考。" },
  { prefix: "/events", title: "事件记录", description: "保存旅途中值得记住的时刻。" },
  { prefix: "/titles", title: "称号图鉴", description: "查看已获得与待解锁的称号。" },
  { prefix: "/equipment", title: "角色装备", description: "管理影响角色状态的装备配置。" },
  { prefix: "/battle-pass", title: "旅程通行证", description: "查看阶段进度与旅程奖励。" },
  { prefix: "/strategy", title: "人生战略", description: "将长期方向拆解为可执行的路径。" },
  { prefix: "/areas", title: "成长领域", description: "深入查看不同生活领域的成长状态。" },
] as const;

const STANDALONE_ROUTES = ["/login", "/onboarding"];
const SYSTEM_CHILD_ROUTES = [
  "/habits",
  "/projects",
  "/strategy",
  "/notes",
  "/analytics",
  "/rewards",
  "/gacha",
  "/titles",
  "/battle-pass",
  "/events",
  "/equipment",
  "/principles",
  "/decisions",
  "/areas",
];

const SIDEBAR_COLLAPSED_KEY = "life-game-sidebar-collapsed";
const USER_MOTTO_KEY = "life-game-user-motto";
const LEGACY_GREETING_MOTTO_KEY = "life-game-greeting-motto";
const DEFAULT_USER_MOTTO = "今天也要为了更好的未来而努力哦！";

function isNavItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/system") {
    return (
      pathname.startsWith("/system") ||
      SYSTEM_CHILD_ROUTES.some((route) => pathname.startsWith(route))
    );
  }
  return pathname.startsWith(href);
}

function readStoredBoolean(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeStoredBoolean(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // ignore storage failures
  }
}

function normalizeMotto(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function readStoredMotto() {
  try {
    const value =
      window.localStorage.getItem(USER_MOTTO_KEY) ??
      window.localStorage.getItem(LEGACY_GREETING_MOTTO_KEY);
    if (value == null) return DEFAULT_USER_MOTTO;
    const trimmed = normalizeMotto(value);
    return trimmed || DEFAULT_USER_MOTTO;
  } catch {
    return DEFAULT_USER_MOTTO;
  }
}

function writeStoredMotto(value: string) {
  try {
    window.localStorage.setItem(USER_MOTTO_KEY, value);
  } catch {
    // ignore storage failures
  }
}

/** Prefer explicit newlines; otherwise keep a short bold first line when possible. */
function splitMottoLines(motto: string): { first: string; rest: string | null } {
  const lines = normalizeMotto(motto)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    return { first: lines[0], rest: lines.slice(1).join(" ") };
  }

  const single = lines[0] || DEFAULT_USER_MOTTO;
  const match = single.match(/^(.{2,14}?[，。！？!?、；;])\s*(.+)$/u);
  if (match?.[2]) {
    return { first: match[1], rest: match[2] };
  }

  return { first: single, rest: null };
}

export function LifeGameShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (STANDALONE_ROUTES.some((route) => pathname.startsWith(route))) {
    return <>{children}</>;
  }

  return <AppShell pathname={pathname}>{children}</AppShell>;
}

function AppShell({ children, pathname }: { children: ReactNode; pathname: string }) {
  const { data: user } = useUser();
  const { data: resin } = useResin();
  const updateUser = useUpdateUser();
  const routeMeta = ROUTE_META.find(({ prefix }) => pathname.startsWith(prefix));
  const isOverview = pathname === "/";
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
  const avatarSrc = user?.avatarUrl || "/lifeos/profile_avatar.png";
  const rawXpProgress = user?.levelProgress ?? 0;
  const xpProgress = Math.max(
    0,
    Math.min(100, rawXpProgress <= 1 ? rawXpProgress * 100 : rawXpProgress),
  );
  const resinProgress = resin ? Math.round((resin.current / Math.max(1, resin.max)) * 100) : 0;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMotto, setUserMotto] = useState(DEFAULT_USER_MOTTO);
  const [editingMottoSource, setEditingMottoSource] = useState<"greeting" | "side" | null>(null);
  const [mottoDraft, setMottoDraft] = useState(DEFAULT_USER_MOTTO);
  const greetingEditorRef = useRef<HTMLTextAreaElement>(null);
  const sideEditorRef = useRef<HTMLTextAreaElement>(null);
  const skipMottoBlurSaveRef = useRef(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const mottoLines = splitMottoLines(userMotto);

  useEffect(() => {
    setSidebarCollapsed(readStoredBoolean(SIDEBAR_COLLAPSED_KEY));
    setUserMotto(readStoredMotto());
  }, []);

  useEffect(() => {
    applyThemeAccent(loadSettingsPrefs().appearance.color, shellRef.current);
  }, []);

  useEffect(() => {
    if (editingMottoSource) return;
    const fromApi = user?.motto ? normalizeMotto(user.motto) : "";
    if (fromApi) {
      setUserMotto(fromApi);
      writeStoredMotto(fromApi);
      return;
    }
    setUserMotto(readStoredMotto());
  }, [user?.motto, editingMottoSource]);

  useEffect(() => {
    if (editingMottoSource === "greeting") {
      greetingEditorRef.current?.focus();
      greetingEditorRef.current?.select();
    }
    if (editingMottoSource === "side") {
      sideEditorRef.current?.focus();
      const el = sideEditorRef.current;
      if (el) {
        const end = el.value.length;
        el.setSelectionRange(end, end);
      }
    }
  }, [editingMottoSource]);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      writeStoredBoolean(SIDEBAR_COLLAPSED_KEY, next);
      return next;
    });
  }

  function beginMottoEdit(source: "greeting" | "side") {
    setMottoDraft(userMotto);
    setEditingMottoSource(source);
  }

  function saveMottoDraft() {
    if (skipMottoBlurSaveRef.current) {
      skipMottoBlurSaveRef.current = false;
      return;
    }
    const next = normalizeMotto(mottoDraft) || DEFAULT_USER_MOTTO;
    setUserMotto(next);
    writeStoredMotto(next);
    setMottoDraft(next);
    setEditingMottoSource(null);
    void updateUser.mutateAsync({ motto: next }).catch(() => {
      // keep local motto; API failure is non-blocking for UX
    });
  }

  function cancelMottoEdit() {
    skipMottoBlurSaveRef.current = true;
    setMottoDraft(userMotto);
    setEditingMottoSource(null);
  }

  function handleGreetingEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveMottoDraft();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelMottoEdit();
    }
  }

  function handleSideEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelMottoEdit();
    }
  }

  return (
    <div
      ref={shellRef}
      className={`${styles.homeShell} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}
      data-life-game-shell
      data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
    >
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand} aria-label="Game Life 首页">
          <span className={styles.brandMark}>
            <PixelHeart />
          </span>
          <span className={styles.brandTitle}>
            <strong>GAME LIFE</strong>
            人生游戏
            <span className={styles.brandSub}>LIFE GAME</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="主要导航">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isNavItemActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                title={label}
                aria-label={label}
              >
                <span className={styles.navIcon}>
                  <Icon size={20} strokeWidth={2.4} />
                </span>
                <span className={styles.navLabel}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sideQuest}>
          <Image
            className={styles.guide}
            src="/life-game/pixel-dragon-v1.png"
            alt="像素龙向导"
            width={168}
            height={128}
            priority
            unoptimized
          />
          {editingMottoSource === "side" ? (
            <textarea
              ref={sideEditorRef}
              className={`${styles.sideQuote} ${styles.sideQuoteEditing}`}
              value={mottoDraft}
              rows={3}
              aria-label="编辑旅途寄语"
              title="编辑旅途寄语，失焦保存"
              onChange={(event) => setMottoDraft(event.target.value)}
              onBlur={saveMottoDraft}
              onKeyDown={handleSideEditorKeyDown}
            />
          ) : (
            <div
              className={styles.sideQuote}
              role="textbox"
              tabIndex={0}
              aria-label="编辑旅途寄语"
              title="点击编辑旅途寄语"
              onClick={() => beginMottoEdit("side")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  beginMottoEdit("side");
                }
              }}
            >
              <b>{mottoLines.first}</b>
              {mottoLines.rest ? (
                <>
                  <br />
                  {mottoLines.rest}
                </>
              ) : null}
            </div>
          )}
        </div>

        <button
          type="button"
          className={styles.sidebarToggle}
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {sidebarCollapsed ? <ChevronRight size={16} strokeWidth={2.6} /> : <ChevronLeft size={16} strokeWidth={2.6} />}
        </button>
      </aside>

      <header className={styles.topbar}>
        <div className={styles.greeting}>
          <h1>
            {isOverview
              ? `${greeting}，${user?.name || "旅行者"}！`
              : routeMeta?.title || "人生冒险"}
          </h1>
          {isOverview ? (
            editingMottoSource === "greeting" ? (
              <textarea
                ref={greetingEditorRef}
                className={`${styles.greetingMotto} ${styles.greetingMottoEditing}`}
                value={mottoDraft}
                rows={2}
                aria-label="编辑今日寄语"
                title="编辑今日寄语，Enter 或失焦保存"
                onChange={(event) => setMottoDraft(event.target.value)}
                onBlur={saveMottoDraft}
                onKeyDown={handleGreetingEditorKeyDown}
              />
            ) : (
              <p
                className={styles.greetingMotto}
                role="textbox"
                tabIndex={0}
                aria-label="编辑今日寄语"
                title="点击编辑今日寄语"
                onClick={() => beginMottoEdit("greeting")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    beginMottoEdit("greeting");
                  }
                }}
              >
                {userMotto}
              </p>
            )
          ) : (
            <p>
              {routeMeta?.description || "继续书写属于你的成长旅程。"}
            </p>
          )}
        </div>

        <div className={styles.topbarTrail}>
          <div className={styles.statusArea}>
            <div className={styles.statusCard}>
              <div className={styles.statusTop}>
                <Zap size={19} fill="#f2c728" color="#111a15" />
                <span>体力</span>
                <span className={styles.statusValue}>
                  {resin?.current ?? 0} / {resin?.max ?? 100}
                </span>
              </div>
              <div className={styles.statusTrack}>
                <div className={styles.statusFill} style={{ width: `${resinProgress}%` }} />
              </div>
              <div className={styles.statusFoot}>
                {resin?.isFull ? "体力已满" : "持续恢复中"}
              </div>
            </div>

            <div className={`${styles.statusCard} ${styles.statusCardWide}`}>
              <div className={styles.statusTop}>
                <Sparkles size={18} color="#9b8300" />
                <span>经验值</span>
                <span className={styles.statusValue}>Lv.{user?.level ?? 1}</span>
              </div>
              <div className={styles.statusTrack}>
                <div
                  className={`${styles.statusFill} ${styles.statusFillGreen}`}
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <div className={styles.statusFoot}>
                {user?.xpIntoLevel ?? 0} / {user?.xpForNext ?? 1000}
              </div>
            </div>
          </div>

          <div className={styles.utility}>
            <Link href="/routines" className={styles.utilityLink} aria-label="日程">
              <CalendarDays size={21} />
            </Link>
            <Link href="/events" className={styles.utilityLink} aria-label="事件">
              <Bell size={21} />
            </Link>
            <Link href="/notes" className={styles.utilityLink} aria-label="笔记">
              <Mail size={21} />
            </Link>
            <Link href="/settings" className={styles.avatarLink}>
              <span className={styles.avatar}>
                <Image src={avatarSrc} alt="" width={49} height={49} unoptimized />
              </span>
              <span>{user?.name || "旅行者"}</span>
            </Link>
          </div>
        </div>
      </header>

      <main
        className={styles.main}
        data-route={routeMeta?.prefix.replace("/", "") || "overview"}
      >
        {children}
      </main>

      <nav className={styles.mobileNav} aria-label="移动端主要导航">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <Link key={href} href={href} className={active ? styles.mobileActive : ""}>
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <MusicPlayer />
    </div>
  );
}

function PixelHeart() {
  return (
    <svg viewBox="0 0 48 48" width="39" height="39" aria-hidden>
      <path
        d="M8 12h6V8h8v4h4V8h8v4h6v6h4v8h-4v6h-6v4h-4v4h-4v4h-4v-4h-4v-4h-4v-4H8v-6H4v-8h4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="miter"
      />
      <path d="M17 16h4v4h-4zm10 0h4v4h-4zm-7 9h8v4h-8z" fill="currentColor" />
      <path d="M3 39h9l5-10 7 6 5-14 4 8h12" fill="none" stroke="#dbee35" strokeWidth="3" />
    </svg>
  );
}
