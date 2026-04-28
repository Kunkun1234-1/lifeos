"use client";

import { Select } from "./ui/input";
import { useAreas } from "@/hooks/queries";

interface Props {
  value: string | null;
  onChange: (v: string | null) => void;
  allowNone?: boolean;
  className?: string;
}

export function AreaSelect({ value, onChange, allowNone = true, className }: Props) {
  const { data: areas } = useAreas();
  return (
    <Select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={className}
    >
      {allowNone && <option value="">— No area —</option>}
      {areas?.map((a) => (
        <option key={a.id} value={a.id}>
          {a.icon} {a.name} · {a.attributeKey}
        </option>
      ))}
    </Select>
  );
}
