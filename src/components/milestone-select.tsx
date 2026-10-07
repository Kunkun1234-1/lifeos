"use client";

import { useMilestones } from "@/hooks/queries";
import { Select } from "./ui/input";

export function MilestoneSelect({ projectId, value, onChange }: {
  projectId: string | null;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const { data: milestones = [], isLoading, isError } = useMilestones(projectId ?? "");
  return (
    <>
      <Select
        aria-label="所属里程碑"
        value={value ?? ""}
        disabled={!projectId || isLoading || isError}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">{!projectId ? "先选择项目" : isLoading ? "正在读取里程碑…" : "待归类"}</option>
        {milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}
      </Select>
      {isError ? <span role="alert">暂时无法读取里程碑，请稍后重试。</span> : null}
    </>
  );
}
