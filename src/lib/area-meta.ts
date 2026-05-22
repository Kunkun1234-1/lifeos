export const AREA_ORDER = [
  "Health",
  "Learning",
  "Relationships",
  "Wellbeing",
  "Creative",
  "Finance",
] as const;

export type AreaName = (typeof AREA_ORDER)[number];

export const AREA_META: Record<
  AreaName,
  {
    cn: string;
    en: string;
    label: string;
    focus: string;
    art: string;
    accentVar: string;
  }
> = {
  Health: {
    cn: "健康",
    en: "Health",
    label: "身体与精力",
    focus: "体能、作息、饮食、运动、恢复",
    art: "/lifeos/module_skills.png",
    accentVar: "var(--attr-str)",
  },
  Learning: {
    cn: "学习",
    en: "Learning",
    label: "知识与技能",
    focus: "课程、练习、阅读、考试、能力建设",
    art: "/lifeos/module_academics.png",
    accentVar: "var(--attr-int)",
  },
  Relationships: {
    cn: "关系",
    en: "Relationships",
    label: "人际与沟通",
    focus: "家人、朋友、协作、表达、社交维护",
    art: "/lifeos/module_relationships.png",
    accentVar: "var(--attr-cha)",
  },
  Wellbeing: {
    cn: "心智",
    en: "Mind",
    label: "情绪与觉察",
    focus: "复盘、压力、专注、价值观、心理弹性",
    art: "/lifeos/module_mind.png",
    accentVar: "var(--attr-wis)",
  },
  Creative: {
    cn: "创造",
    en: "Creative",
    label: "作品与输出",
    focus: "写作、作品、表达、探索、公开输出",
    art: "/lifeos/module_reputation.png",
    accentVar: "var(--attr-cre)",
  },
  Finance: {
    cn: "财富",
    en: "Wealth",
    label: "资产与现金流",
    focus: "资产、收入、支出、预算、长期积累",
    art: "/lifeos/module_wealth.png",
    accentVar: "var(--attr-gold)",
  },
};
