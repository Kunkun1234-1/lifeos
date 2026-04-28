"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { useUser, useUpdateUser, useFreeze, useBuyFreeze } from "@/hooks/queries";
import { Snowflake } from "lucide-react";

const CLASSES = ["Scholar", "Athlete", "Artist", "Engineer", "Connector"] as const;

export default function SettingsPage() {
  const { data: user } = useUser();
  const update = useUpdateUser();

  const [name, setName] = useState("");
  const [klass, setKlass] = useState<(typeof CLASSES)[number]>("Scholar");
  const [vision, setVision] = useState("");
  const [values, setValues] = useState("");
  const [identities, setIdentities] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setKlass((user.class as (typeof CLASSES)[number]) ?? "Scholar");
      setVision(user.visionStatement ?? "");
      setValues(user.coreValues.join("\n"));
      setIdentities(user.identityStatements.join("\n"));
    }
  }, [user]);

  const submit = async () => {
    await update.mutateAsync({
      name,
      class: klass,
      visionStatement: vision || null,
      coreValues: values.split("\n").map((x) => x.trim()).filter(Boolean),
      identityStatements: identities.split("\n").map((x) => x.trim()).filter(Boolean),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Identity &amp; vision — the north stars that keep the system coherent.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your avatar and class.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Display Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Class</Label>
            <Select value={klass} onChange={(e) => setKlass(e.target.value as typeof klass)}>
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
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
