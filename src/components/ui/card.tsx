import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "cream" | "cream-framed" | "cream-ornate" | "ink" | "plain";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "cream", ...props }, ref) => {
    const base =
      variant === "cream-ornate"
        ? "panel-cream ornate rounded-sm"
        : variant === "cream-framed"
        ? "panel-cream framed rounded-sm"
        : variant === "ink"
        ? "panel-ink rounded-sm"
        : variant === "plain"
        ? "rounded-sm border border-[var(--border)] bg-[var(--bg-card)]"
        : "panel-cream rounded-sm";
    return <div ref={ref} className={cn(base, className)} {...props} />;
  }
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5 p-5 pb-3", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-display text-lg font-bold tracking-wide text-[var(--fg-strong)]",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-[var(--fg-muted)]", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-5 pt-3", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";
