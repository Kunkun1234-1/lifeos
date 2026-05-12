"use client";

import { Select } from "./ui/input";
import { useProjects } from "@/hooks/queries";

interface Props {
  value: string | null;
  onChange: (v: string | null) => void;
  allowNone?: boolean;
  className?: string;
}

/**
 * Project picker. Only shows actionable projects (idea + active);
 * a project that is already selected is also shown so the user can
 * see what's linked even if it has since been paused/archived.
 */
export function ProjectSelect({ value, onChange, allowNone = true, className }: Props) {
  const { data: projects } = useProjects();
  const visible = (projects ?? []).filter(
    (p) => p.status === "idea" || p.status === "active" || p.id === value,
  );
  return (
    <Select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={className}
    >
      {allowNone && <option value="">— No project —</option>}
      {visible.map((p) => (
        <option key={p.id} value={p.id}>
          {p.title}
          {p.status !== "active" && p.status !== "idea" ? ` · ${p.status}` : ""}
        </option>
      ))}
    </Select>
  );
}
