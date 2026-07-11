"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { useUser, useUpdateUser, useFreeze, useBuyFreeze } from "@/hooks/queries";
import { Snowflake, Upload } from "lucide-react";
import { signOutAction } from "@/app/login/actions";
import { api } from "@/lib/fetcher";

const CLASSES = ["Scholar", "Athlete", "Artist", "Engineer", "Connector"] as const;

export default function SettingsPage() {
  const { data: user } = useUser();
  const update = useUpdateUser();
  const hydratedUserId = useRef<string | null>(null);

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

  useEffect(() => {
    if (user && hydratedUserId.current !== user.id) {
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
    }
  }, [user]);

  const persistAvatar = async (nextUrl: string | null) => {
    const previous = avatarUrl;
    setAvatarUrl(nextUrl);
    setAvatarSaveError(null);
    setAvatarSaving(true);
    try {
      await update.mutateAsync({ avatarUrl: nextUrl });
    } catch (e) {
      setAvatarUrl(previous);
      setAvatarSaveError((e as Error).message || "头像保存失败");
    } finally {
      setAvatarSaving(false);
    }
  };

  const submit = async () => {
    await update.mutateAsync({
      name,
      class: klass,
      visionStatement: vision || null,
      coreValues: values.split("\n").map((x) => x.trim()).filter(Boolean),
      identityStatements: identities.split("\n").map((x) => x.trim()).filter(Boolean),
      avatarUrl: avatarUrl || null,
      gender: gender || null,
      birthday: birthday || null,
      region: region || null,
      motto: motto || null,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Identity & vision — the north stars that keep the system coherent.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile · 个人信息</CardTitle>
          <CardDescription>头像、姓名、基础信息（生日 → 年龄、地区、人生信条）。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <AvatarPicker
            value={avatarUrl}
            onChange={persistAvatar}
            saving={avatarSaving}
            saveError={avatarSaveError}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Display Name · 昵称</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Class · 职业</Label>
              <Select value={klass} onChange={(e) => setKlass(e.target.value as typeof klass)}>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>性别 · Gender</Label>
              <Input
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                placeholder="男 / 女 / 其他 / 自定义"
                maxLength={20}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>生日 · Birthday</Label>
              <Input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>地区 · Region</Label>
              <Input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="蒙德城 / 北京 / Tokyo …"
                maxLength={60}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>人生信条 · Motto</Label>
              <Textarea
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                placeholder='一句你想随身携带的话，例如："旅途的意义不在于终点，而在于沿途的选择与风景。"'
                rows={3}
                maxLength={280}
              />
              <p className="text-[10px] text-[var(--fg-subtle)]">
                展示在左侧 Profile · 与 Vision Statement 不同：Motto 是 1 行心境，Vision 是 10 年箭头。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vision &amp; Identity</CardTitle>
          <CardDescription>
            Per design doc §3.1: what you&apos;re building toward + who you&apos;re becoming.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Vision statement (10-year)</Label>
            <Textarea
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              placeholder="A 1-sentence arrow, e.g. &lsquo;a generalist engineer shipping products that teach&rsquo;"
              rows={2}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Core Values (one per line, 3-5 recommended)</Label>
            <Textarea
              value={values}
              onChange={(e) => setValues(e.target.value)}
              placeholder={"Integrity\nCuriosity\nHealth\n…"}
              rows={4}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Identity Statements (&ldquo;I am …&rdquo;)</Label>
            <Textarea
              value={identities}
              onChange={(e) => setIdentities(e.target.value)}
              placeholder={"I am a writer\nI am someone who trains every day\n…"}
              rows={4}
            />
            <p className="text-xs text-[var(--fg-subtle)]">
              Per Atomic Habits — frame identity, not outcome. &ldquo;I am a runner&rdquo; &gt;
              &ldquo;I want to run a marathon&rdquo;.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <FreezePanel />

      <AccountPanel />
    </div>
  );
}

function AccountPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account · 账号</CardTitle>
        <CardDescription>登出当前账号；下次登录后数据保留。</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signOutAction}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AvatarPicker({
  value,
  onChange,
  saving = false,
  saveError = null,
}: {
  value: string | null;
  onChange: (url: string | null) => void | Promise<void>;
  saving?: boolean;
  saveError?: string | null;
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
      await onChange(url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const src = value || "/lifeos/profile_avatar.png";
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[var(--gold)] bg-[var(--bg-card)]">
        <Image src={src} alt="avatar" width={80} height={80} className="h-full w-full object-cover" unoptimized />
      </div>
      <div className="flex flex-col gap-2">
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
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => ref.current?.click()}
            disabled={busy || saving}
          >
            <Upload size={14} /> {busy ? "上传中…" : saving ? "保存中…" : "上传图片"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void onChange(null)}
              disabled={busy || saving}
            >
              恢复默认
            </Button>
          )}
        </div>
        <div className="text-[10px] text-[var(--fg-subtle)]">
          PNG / JPG / WebP / GIF / SVG · ≤ 4 MB · 建议正方形
        </div>
        {err && <div className="text-[11px] text-[var(--danger)]">{err}</div>}
        {saveError && <div className="text-[11px] text-[var(--danger)]">{saveError}</div>}
      </div>
    </div>
  );
}

function FreezePanel() {
  const { data: freeze } = useFreeze();
  const { data: user } = useUser();
  const buy = useBuyFreeze();
  const cost = freeze?.costGold ?? 50;
  const canAfford = (user?.currency.gold ?? 0) >= cost;

  return (
    <Card variant="cream-framed">
      <CardHeader>
        <CardTitle>Streak Freeze · 连击护符</CardTitle>
        <CardDescription>
          每张可免疫一次日程连击中断（断了一天的日程不会清零 streak）。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-sm border-2 border-[var(--accent)] bg-[var(--accent)]/10 text-3xl text-[var(--accent)]">
            <Snowflake />
          </div>
          <div className="flex-1">
            <div className="font-display text-2xl font-bold text-[var(--fg-strong)]">
              ×{freeze?.count ?? 0}
            </div>
            <div className="text-xs text-[var(--fg-muted)]">
              库存（已使用 {freeze?.totalUsed ?? 0} 次）
            </div>
          </div>
          <div className="text-right">
            <Button
              disabled={!canAfford || buy.isPending}
              onClick={() => buy.mutate()}
            >
              + 购买（⭐{cost}）
            </Button>
            {!canAfford && (
              <div className="mt-1 text-[10px] text-[var(--danger)]">Mora 不足</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
