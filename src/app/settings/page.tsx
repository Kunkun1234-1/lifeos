"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import {
  Check,
  ChevronRight,
  Palette,
  Pencil,
  Upload,
  UserRound,
  Wallet,
  CalendarDays,
} from "lucide-react";
import {
  useAssets,
  useUpdateUser,
  useUpdateWalletSettings,
  useUser,
} from "@/hooks/queries";
import { signOutAction } from "@/app/login/actions";
import { api } from "@/lib/fetcher";
import {
  applyThemeAccent,
  DEFAULT_SETTINGS_PREFS,
  loadSettingsPrefs,
  saveSettingsPrefs,
  THEME_COLORS,
  THEME_LABELS,
  type SettingsPrefs,
  type TaskPriorityKey,
  type ThemeColorKey,
} from "@/lib/settings-prefs";
import styles from "./page.module.css";

const CLASSES = ["Scholar", "Athlete", "Artist", "Engineer", "Connector"] as const;

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function journeyDay(iso: string | null | undefined) {
  if (!iso) return 1;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return 1;
  return Math.max(1, Math.floor((Date.now() - start) / 86_400_000) + 1);
}

function clampPct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function redistributeFinance(
  current: { savings: number; freedom: number },
  key: "savings" | "freedom",
  next: number,
) {
  const value = clampPct(next);
  const other = key === "savings" ? "freedom" : "savings";
  return { [key]: value, [other]: 100 - value } as {
    savings: number;
    freedom: number;
  };
}

export default function SettingsPage() {
  const { data: user } = useUser();
  const { data: assets } = useAssets();
  const updateUser = useUpdateUser();
  const updateWallet = useUpdateWalletSettings();

  const [prefs, setPrefs] = useState<SettingsPrefs>(DEFAULT_SETTINGS_PREFS);
  const [prefsReady, setPrefsReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [klass, setKlass] = useState<(typeof CLASSES)[number]>("Scholar");
  const [vision, setVision] = useState("");
  const [values, setValues] = useState("");
  const [identities, setIdentities] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [gender, setGender] = useState("");
  const [birthday, setBirthday] = useState("");
  const [region, setRegion] = useState("");
  const [motto, setMotto] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarSaveError, setAvatarSaveError] = useState<string | null>(null);
  const [finance, setFinance] = useState({ savings: 50, freedom: 50 });
  const hydratedUserId = useRef<string | null>(null);
  const financeHydrated = useRef(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loaded = loadSettingsPrefs();
    setPrefs(loaded);
    applyThemeAccent(loaded.appearance.color);
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    if (!user || hydratedUserId.current === user.id) return;
    hydratedUserId.current = user.id;
    setName(user.name);
    setKlass((user.class as (typeof CLASSES)[number]) ?? "Scholar");
    setVision(user.visionStatement ?? "");
    setValues(user.coreValues.join("\n"));
    setIdentities(user.identityStatements.join("\n"));
    setAvatarUrl(user.avatarUrl ?? null);
    setGender(user.gender ?? "");
    setBirthday(user.birthday ? user.birthday.slice(0, 10) : "");
    setRegion(user.region ?? "");
    setMotto(user.motto ?? "");
  }, [user]);

  useEffect(() => {
    if (!prefsReady || !assets?.plan || financeHydrated.current) return;
    financeHydrated.current = true;
    const savings = clampPct(assets.plan.savingsRateBps / 100);
    setFinance({ savings, freedom: 100 - savings });
  }, [assets, prefsReady]);

  const persistAvatar = async (nextUrl: string | null) => {
    const previous = avatarUrl;
    setAvatarUrl(nextUrl);
    setAvatarSaveError(null);
    setAvatarSaving(true);
    try {
      await updateUser.mutateAsync({ avatarUrl: nextUrl });
    } catch (e) {
      setAvatarUrl(previous);
      setAvatarSaveError((e as Error).message || "头像保存失败");
    } finally {
      setAvatarSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setAvatarSaveError(null);
    setAvatarSaving(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { url } = await api<{ url: string }>("/api/upload", {
        method: "POST",
        body: form,
        backend: true,
      });
      await persistAvatar(url);
    } catch (e) {
      setAvatarSaveError((e as Error).message || "上传失败");
      setAvatarSaving(false);
    }
  };

  const setThemeColor = (color: ThemeColorKey) => {
    setPrefs((prev) => {
      const next = { ...prev, appearance: { color } };
      saveSettingsPrefs(next);
      applyThemeAccent(color);
      return next;
    });
  };

  const setDefaultPriority = (defaultPriority: TaskPriorityKey) => {
    setPrefs((prev) => {
      const next = { ...prev, tasks: { defaultPriority } };
      saveSettingsPrefs(next);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    setSaveError(null);
    try {
      await updateUser.mutateAsync({
        name,
        class: klass,
        visionStatement: vision || null,
        coreValues: values
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
        identityStatements: identities
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
        avatarUrl: avatarUrl || null,
        gender: gender || null,
        birthday: birthday || null,
        region: region || null,
        motto: motto || null,
      });

      if (assets?.plan) {
        await updateWallet.mutateAsync({
          livingTargetCents: assets.plan.livingTargetCents,
          savingsRateBps: Math.round(finance.savings * 100),
          carryLivingTarget: assets.plan.carryLivingTarget,
        });
      }

      saveSettingsPrefs(prefs);
      applyThemeAccent(prefs.appearance.color);
      setSaveMsg("设置已保存");
      setEditing(false);
    } catch (e) {
      setSaveError((e as Error).message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = () => {
    const next = structuredClone(DEFAULT_SETTINGS_PREFS);
    setPrefs(next);
    saveSettingsPrefs(next);
    applyThemeAccent(next.appearance.color);
    setSaveMsg("已恢复本地默认偏好（账户资料与财务规则未改动）");
    setSaveError(null);
  };

  const avatarSrc = avatarUrl || "/lifeos/profile_avatar.png";
  const dayCount = journeyDay(user?.onboardedAt ?? user?.createdAt);
  const timezone = user?.timezone ?? "Asia/Shanghai";
  const livingLabel =
    assets?.plan != null
      ? `¥${(assets.plan.livingTargetCents / 100).toLocaleString("zh-CN", {
          maximumFractionDigits: 0,
        })} / 月`
      : "未设置";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>设置</h1>
        <p className={styles.subtitle}>
          个性化你的人生游戏体验，让规划与成长更顺手。
        </p>
      </header>

      <div className={styles.columns}>
        <section id="settings-account" className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>
              <UserRound size={15} strokeWidth={1.75} />
              账户与资料
            </h2>
          </div>

          <div className={styles.profileRow}>
            <div className={styles.avatarWrap}>
              <Image
                src={avatarSrc}
                alt=""
                fill
                sizes="88px"
                className={styles.avatarImg}
                unoptimized
              />
              <button
                type="button"
                className={styles.avatarBtn}
                title="上传头像"
                disabled={avatarSaving}
                onClick={() => avatarInputRef.current?.click()}
              >
                <Upload size={12} />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadAvatar(f);
                  e.target.value = "";
                }}
              />
            </div>

            <div className={styles.profileMain}>
              <div className={styles.nameRow}>
                <h3 className={styles.name}>{user?.name ?? "旅人"}</h3>
                <button
                  type="button"
                  className={styles.nameEdit}
                  title="编辑资料"
                  onClick={() => setEditing((v) => !v)}
                >
                  <Pencil size={13} />
                </button>
              </div>
              <div className={styles.badges}>
                <span className={`${styles.badge} ${styles.badgeLevel}`}>
                  Lv.{user?.level ?? 1}
                </span>
                <span className={`${styles.badge} ${styles.badgePhase}`}>
                  探索期 · 第 {dayCount} 天
                </span>
              </div>
            </div>
          </div>

          <div className={styles.fieldList}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>邮箱</span>
              <span className={styles.fieldValue}>{user?.email ?? "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>账号 ID</span>
              <span className={styles.fieldValue}>{user?.id ?? "—"}</span>
            </div>
          </div>

          <div className={styles.metaRow}>
            <span>
              注册日 <strong>{formatDate(user?.createdAt)}</strong>
            </span>
            <span>
              时区 <strong>{timezone}</strong>
            </span>
            <span>
              语言 <strong>简体中文</strong>
            </span>
          </div>

          {avatarSaveError ? (
            <p className={styles.error}>{avatarSaveError}</p>
          ) : null}

          <div className={styles.cardActions}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => setEditing((v) => !v)}
            >
              <Pencil size={13} />
              {editing ? "收起编辑" : "编辑资料"}
            </button>
          </div>

          {editing ? (
            <div className={styles.editPanel}>
              <div className={styles.editGrid}>
                <label className={styles.editField}>
                  <span className={styles.editLabel}>昵称</span>
                  <input
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className={styles.editField}>
                  <span className={styles.editLabel}>职业</span>
                  <select
                    className={styles.select}
                    value={klass}
                    onChange={(e) =>
                      setKlass(e.target.value as (typeof CLASSES)[number])
                    }
                  >
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.editField}>
                  <span className={styles.editLabel}>性别</span>
                  <input
                    className={styles.input}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    placeholder="男 / 女 / 其他"
                    maxLength={20}
                  />
                </label>
                <label className={styles.editField}>
                  <span className={styles.editLabel}>生日</span>
                  <input
                    className={styles.input}
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                  />
                </label>
                <label className={`${styles.editField} ${styles.editFieldWide}`}>
                  <span className={styles.editLabel}>地区</span>
                  <input
                    className={styles.input}
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    maxLength={60}
                  />
                </label>
                <label className={`${styles.editField} ${styles.editFieldWide}`}>
                  <span className={styles.editLabel}>人生信条</span>
                  <textarea
                    className={styles.textarea}
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    rows={2}
                    maxLength={280}
                  />
                </label>
                <label className={`${styles.editField} ${styles.editFieldWide}`}>
                  <span className={styles.editLabel}>十年愿景</span>
                  <textarea
                    className={styles.textarea}
                    value={vision}
                    onChange={(e) => setVision(e.target.value)}
                    rows={2}
                  />
                </label>
                <label className={`${styles.editField} ${styles.editFieldWide}`}>
                  <span className={styles.editLabel}>核心价值观（每行一条）</span>
                  <textarea
                    className={styles.textarea}
                    value={values}
                    onChange={(e) => setValues(e.target.value)}
                    rows={3}
                  />
                </label>
                <label className={`${styles.editField} ${styles.editFieldWide}`}>
                  <span className={styles.editLabel}>身份声明（每行一条）</span>
                  <textarea
                    className={styles.textarea}
                    value={identities}
                    onChange={(e) => setIdentities(e.target.value)}
                    rows={3}
                  />
                </label>
              </div>
              <p className={styles.hint}>
                资料修改点底部「保存更改」一并写入。
              </p>
            </div>
          ) : null}
        </section>

        <section id="settings-appearance" className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>
              <Palette size={15} strokeWidth={1.75} />
              外观主题
            </h2>
          </div>

          <p className={styles.sectionLabel}>主题色</p>
          <div className={styles.swatchRow}>
            {THEME_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                title={c.label}
                aria-label={c.label}
                className={`${styles.swatch} ${prefs.appearance.color === c.key ? styles.swatchActive : ""}`}
                style={{ background: c.color }}
                onClick={() => setThemeColor(c.key)}
              >
                {prefs.appearance.color === c.key ? (
                  <span className={styles.swatchCheck}>
                    <Check size={14} strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <p className={styles.hint}>
            当前：{THEME_LABELS[prefs.appearance.color]}（本机生效，立即应用到侧栏与顶栏）
          </p>
        </section>

        <section id="settings-finance" className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>
              <Wallet size={15} strokeWidth={1.75} />
              财务规则
            </h2>
            <span className={styles.cardMeta}>合计 100%</span>
          </div>

          <div className={styles.sliderBlock}>
            {(
              [
                ["savings", "储蓄池", styles.sliderTrackSavings],
                ["freedom", "自由池", styles.sliderTrackFreedom],
              ] as const
            ).map(([key, label, trackClass]) => {
              const value = finance[key];
              return (
                <div key={key} className={styles.sliderRow}>
                  <div className={styles.sliderHead}>
                    <span>{label}</span>
                    <span>{value}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={value}
                    className={`${styles.slider} ${trackClass}`}
                    style={{ "--fill": `${value}%` } as CSSProperties}
                    onChange={(e) =>
                      setFinance((prev) =>
                        redistributeFinance(prev, key, Number(e.target.value)),
                      )
                    }
                  />
                </div>
              );
            })}
          </div>

          <div className={styles.livingRow}>
            <div>
              <span className={styles.editLabel}>生活费目标</span>
              <p className={styles.livingValue}>{livingLabel}</p>
            </div>
            <button
              type="button"
              className={styles.btnLink}
              onClick={() => {
                window.location.href = "/assets";
              }}
            >
              去资产页设置 <ChevronRight size={14} />
            </button>
          </div>
          <p className={styles.hint}>
            储蓄/自由比例随「保存更改」写入资产预算；生活费按金额在资产页管理。
          </p>
        </section>

        <section id="settings-tasks" className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>
              <CalendarDays size={15} strokeWidth={1.75} />
              任务偏好
            </h2>
          </div>

          <div className={styles.formStack}>
            <label className={styles.formRow}>
              <span className={styles.editLabel}>新建任务默认优先级</span>
              <select
                className={styles.select}
                value={prefs.tasks.defaultPriority}
                onChange={(e) =>
                  setDefaultPriority(e.target.value as TaskPriorityKey)
                }
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </label>
          </div>
          <p className={styles.hint}>本机偏好，创建任务时自动带入。</p>
        </section>
      </div>

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={saving || updateUser.isPending || updateWallet.isPending}
          onClick={() => void handleSave()}
        >
          {saving ? "保存中…" : "保存更改"}
        </button>
        <div className={styles.footerSecondary}>
          <button type="button" className={styles.btnSecondary} onClick={handleRestore}>
            恢复默认
          </button>
          <form action={signOutAction}>
            <button type="submit" className={styles.btnDanger}>
              退出登录
            </button>
          </form>
        </div>
        {saveMsg ? <p className={styles.saveMsg}>{saveMsg}</p> : null}
        {saveError ? <p className={styles.error}>{saveError}</p> : null}
      </footer>
    </div>
  );
}
