"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--bg-raised)] shadow-[inset_0_0_0_1px_var(--border-strong)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--accent-strong)] data-[state=checked]:shadow-[0_0_12px_-2px_var(--accent)]",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      <Check size={14} className="text-white" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";
