"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0..1
  barClassName?: string;
  indeterminate?: boolean;
}

export function Progress({ value, className, barClassName, indeterminate, ...rest }: ProgressProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-[var(--bg-raised)] shadow-[inset_0_0_0_1px_var(--border)]", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      {...rest}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-[var(--accent-strong)] to-[var(--accent-glow)] transition-[width] duration-500 ease-out",
          indeterminate && "animate-pulse",
          barClassName
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
