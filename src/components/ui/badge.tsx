import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "accent" | "success" | "warning" | "danger";
}

const TONE: Record<NonNullable<BadgeProps["tone"]>, string> = {
  default: "bg-[var(--bg-elevated)] text-[var(--fg-muted)] shadow-[inset_0_0_0_1px_var(--border)]",
  accent:  "bg-[var(--accent-strong)]/20 text-[var(--accent-glow)] shadow-[inset_0_0_0_1px_var(--accent)]",
  success: "bg-[var(--success)]/15 text-[var(--success)] shadow-[inset_0_0_0_1px_var(--success)]",
  warning: "bg-[var(--warning)]/15 text-[var(--warning)] shadow-[inset_0_0_0_1px_var(--warning)]",
  danger:  "bg-[var(--danger)]/15 text-[var(--danger)] shadow-[inset_0_0_0_1px_var(--danger)]",
};

export function Badge({ tone = "default", className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        TONE[tone],
        className
      )}
      {...rest}
    />
  );
}
