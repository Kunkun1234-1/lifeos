"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 rounded-sm text-sm transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] overflow-hidden",
  {
    variants: {
      variant: {
        primary: "btn-gold font-display font-semibold uppercase tracking-[0.14em]",
        secondary:
          "bg-[var(--bg-card)] text-[var(--fg)] border border-[var(--border-strong)]/70 hover:border-[var(--gold)] hover:bg-[var(--bg-raised)] font-display",
        ghost:
          "text-[var(--fg-muted)] hover:bg-[var(--gold-tint)] hover:text-[var(--fg-strong)]",
        outline:
          "text-[var(--fg)] border border-[var(--border-strong)] bg-transparent hover:border-[var(--gold)] hover:bg-[var(--gold-tint)]",
        danger:
          "bg-[var(--danger)] text-white border border-[#8a2319] hover:brightness-110",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-5",
        lg: "h-12 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";
