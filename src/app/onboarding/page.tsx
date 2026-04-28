"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { useUpdateUser, useUser } from "@/hooks/queries";

const CLASSES = ["Scholar", "Athlete", "Artist", "Engineer", "Connector"] as const;

const STEPS = [
  { title: "Choose your class", hint: "Archetype that shapes defaults. You can change it later." },
  { title: "What is your 10-year vision?", hint: "One sentence. The arrow that aims everything else." },
  { title: "Identity statements", hint: "Atomic Habits §2: identity > outcomes. Write 1-5." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: user } = useUser();
  const update = useUpdateUser();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name ?? "Player One");
  const [klass, setKlass] = useState<(typeof CLASSES)[number]>("Scholar");
  const [vision, setVision] = useState("");
  const [identities, setIdentities] = useState("");

  const finish = async () => {
    await update.mutateAsync({
      name,
      class: klass,
      visionStatement: vision || null,
      identityStatements: identities
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      onboarded: true,
    });
    router.push("/");
  };

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 p-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-xs tracking-[0.3em] text-[var(--fg-subtle)]">ONBOARDING</div>
        <h1 className="mt-1 bg-gradient-to-r from-[var(--accent-glow)] to-[var(--accent)] bg-clip-text text-3xl font-bold text-transparent">
          Welcome to LifeOS
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          {STEPS[step].hint}
        </p>
      </motion.div>

      <div className="flex gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-10 rounded-full ${
              i <= step ? "bg-[var(--accent-strong)]" : "bg-[var(--border)]"
            }`}
          />
        ))}
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{STEPS[step].title}</CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="s0"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="grid gap-4"
              >
                <div className="grid gap-1.5">
                  <Label>Your name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Class</Label>
                  <Select
                    value={klass}
                    onChange={(e) => setKlass(e.target.value as typeof klass)}
                  >
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
              </motion.div>
            )}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="grid gap-4"
              >
                <div className="grid gap-1.5">
                  <Label>Vision</Label>
                  <Textarea
                    value={vision}
                    onChange={(e) => setVision(e.target.value)}
                    rows={3}
                    placeholder="e.g. A generalist engineer who ships products that teach."
                    autoFocus
                  />
                </div>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="grid gap-4"
              >
                <div className="grid gap-1.5">
                  <Label>Identity statements (&ldquo;I am …&rdquo;, one per line)</Label>
                  <Textarea
                    value={identities}
                    onChange={(e) => setIdentities(e.target.value)}
                    rows={5}
                    placeholder={"I am a writer\nI am someone who trains every day\nI am a careful decision-maker"}
                    autoFocus
                  />
                </div>
                <CardDescription>
                  Identity drives habits. These will show on your Dashboard as a daily reminder.
                </CardDescription>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="flex w-full justify-between">
        <Button variant="ghost" onClick={prev} disabled={step === 0}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>Next →</Button>
        ) : (
          <Button onClick={finish} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Begin"}
          </Button>
        )}
      </div>
    </div>
  );
}
