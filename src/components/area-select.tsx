"use client";

import { Select } from "./ui/input";
import { useAreas } from "@/hooks/queries";
import { AREA_META, type AreaName } from "@/lib/area-meta";

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
      aria-label="人生领域"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={className}
    >
      {allowNone && <option value="">未指定领域</option>}
      {areas?.map((a) => (
        <option key={a.id} value={a.id}>
          {a.icon} {AREA_META[a.name as AreaName]?.cn ?? a.name}
        </option>
      ))}
    </Select>
  );
}
