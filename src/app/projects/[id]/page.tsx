"use client";

import { useParams } from "next/navigation";
import { PlanningOverview } from "@/components/planning/planning-overview";
import { useProjectTree } from "@/hooks/queries";

export default function ProjectOverviewPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useProjectTree(params.id);

  if (isLoading) return <PageState title="正在展开项目" detail="正在读取里程碑与任务…" />;
  if (error) return <PageState title="项目概况暂时无法打开" detail={error.message} danger />;
  if (!data) return <PageState title="未找到这个项目" detail="它可能已经被删除，或你没有访问权限。" danger />;

  return <PlanningOverview mode="project" tree={data} />;
}

function PageState({ title, detail, danger = false }: { title: string; detail: string; danger?: boolean }) {
  return (
    <main className="min-h-[calc(100vh-117px)] bg-[#f7f7ed] px-6 py-16">
      <div className="mx-auto max-w-xl rounded-xl border border-[#d9dcc3] bg-[#fffef8] p-8 text-center shadow-sm">
        <h1 className={`font-display text-xl font-bold ${danger ? "text-[var(--danger)]" : "text-[var(--fg-strong)]"}`}>{title}</h1>
        <p className="mt-3 text-sm text-[var(--fg-muted)]">{detail}</p>
      </div>
    </main>
  );
}
