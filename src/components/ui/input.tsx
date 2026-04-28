import * as React from "react";
import { cn } from "@/lib/utils";

const baseField =
  "flex w-full rounded-sm bg-white/70 px-3 py-2 text-sm text-[var(--fg-strong)] placeholder:text-[var(--fg-subtle)] border border-[var(--border-strong)]/60 transition-all focus:border-[var(--gold)] focus:shadow-[0_0_0_2px_var(--gold-tint)] focus:outline-none disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(baseField, "h-9", className)} {...props} />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(baseField, "min-h-20 resize-y", className)} {...props} />
  )
);
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-[11px] font-display-en font-semibold uppercase tracking-[0.2em] text-[var(--gold-deep)]",
        className
      )}
      {...props}
    />
  )
);
Label.displayName = "Label";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(baseField, "h-9", className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";
