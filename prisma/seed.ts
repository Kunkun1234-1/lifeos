import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_AREAS = [
  { name: "Health",        icon: "💪", color: "#EF4444", attributeKey: "STR", order: 0 },
  { name: "Learning",      icon: "🧠", color: "#3B82F6", attributeKey: "INT", order: 1 },
  { name: "Relationships", icon: "❤️", color: "#EC4899", attributeKey: "CHA", order: 2 },
  { name: "Wellbeing",     icon: "🧘", color: "#10B981", attributeKey: "WIS", order: 3 },
  { name: "Creative",      icon: "🎨", color: "#F59E0B", attributeKey: "CRE", order: 4 },
  { name: "Finance",       icon: "💰", color: "#EAB308", attributeKey: "GOLD", order: 5 },
] as const;

/**
 * Achievement definitions — global, shared across users.
 * Trigger format: "<metric>:<threshold>"
 *   metrics:
 *     task_done_count       — total completed tasks
 *     habit_tick_count      — total positive habit ticks
 *     routine_streak_max    — best routine streak
 *     routine_total         — total routine completions
 *     daily_review_count    — total daily reviews
 *     commission_full_count — # days all 4 commissions done
 *     project_done_count    — # projects completed
 *     goal_done_count       — # goals completed
 *     total_xp              — cumulative XP
 *     level                 — user level reached
 *     bp_level_max          — best BP level reached in any week
 *     weekly_review_count   — total weekly reviews completed
 *     principle_count       — # active principles in library
 *     decision_count        — total decisions logged
 *     decision_reviewed_count — # decisions with post-mortem complete
 *     note_count            — # active notes in Knowledge Base
 */
const ACHIEVEMENTS = [
  // ---------- Bronze ----------
  { key: "first_task",      name: "初入征途",   description: "完成第 1 个任务",          tier: "bronze", category: "milestone",  trigger: "task_done_count:1",      emoji: "🌱", rewardGold: 10 },
  { key: "first_routine",   name: "晨光初现",   description: "完成第 1 个日程",          tier: "bronze", category: "milestone",  trigger: "routine_total:1",        emoji: "🔆", rewardGold: 10 },
  { key: "first_review",    name: "回望之眼",   description: "完成第 1 次每日复盘",      tier: "bronze", category: "milestone",  trigger: "daily_review_count:1",   emoji: "📖", rewardGold: 10, rewardFate: 1 },
  { key: "tasks_10",        name: "勤恳行者",   description: "累计完成 10 个任务",       tier: "bronze", category: "cumulative", trigger: "task_done_count:10",     emoji: "✅", rewardGold: 30 },

  // ---------- Silver ----------
  { key: "streak_7",        name: "七日连击",   description: "任一日程连击达到 7 天",     tier: "silver", category: "streak",     trigger: "routine_streak_max:7",   emoji: "🔥", rewardGold: 50, rewardGems: 1 },
  { key: "tasks_50",        name: "百炼成钢",   description: "累计完成 50 个任务",       tier: "silver", category: "cumulative", trigger: "task_done_count:50",     emoji: "⚒️", rewardGold: 80, rewardGems: 1 },
  { key: "habits_50",       name: "习惯之力",   description: "累计正向习惯打卡 50 次",   tier: "silver", category: "cumulative", trigger: "habit_tick_count:50",    emoji: "🎯", rewardGold: 80 },
  { key: "level_5",         name: "初露锋芒",   description: "等级达到 5 级",            tier: "silver", category: "milestone",  trigger: "level:5",                emoji: "⭐", rewardGold: 100, rewardFate: 2 },
  { key: "review_weekly",   name: "周周回望",   description: "完成 7 次每日复盘",        tier: "silver", category: "cumulative", trigger: "daily_review_count:7",   emoji: "📓", rewardGold: 50, rewardFate: 2 },

  // ---------- Gold ----------
  { key: "streak_30",       name: "卅日不辍",   description: "任一日程连击达到 30 天",   tier: "gold",   category: "streak",     trigger: "routine_streak_max:30",  emoji: "🌟", rewardGold: 200, rewardGems: 3, rewardFate: 1 },
  { key: "commissions_30",  name: "凯瑟琳的常客", description: "累计 30 次 4/4 委托达成", tier: "gold",   category: "cumulative", trigger: "commission_full_count:30", emoji: "🎖️", rewardGold: 300, rewardGems: 5 },
  { key: "first_project",   name: "项目落地",   description: "完成第 1 个项目",          tier: "gold",   category: "milestone",  trigger: "project_done_count:1",   emoji: "🏗️", rewardGold: 200, rewardGems: 2, rewardFate: 1 },
  { key: "first_goal",      name: "目标达成",   description: "完成第 1 个 OKR 目标",     tier: "gold",   category: "milestone",  trigger: "goal_done_count:1",      emoji: "🎯", rewardGold: 300, rewardGems: 3, rewardFate: 2 },
  { key: "level_10",        name: "登堂入室",   description: "等级达到 10 级",           tier: "gold",   category: "milestone",  trigger: "level:10",               emoji: "👑", rewardGold: 400, rewardGems: 5, rewardFate: 3 },

  // ---------- Legendary ----------
  { key: "streak_100",      name: "百日加冕",   description: "任一日程连击达到 100 天",  tier: "legendary", category: "streak",     trigger: "routine_streak_max:100", emoji: "👑", rewardGold: 800, rewardGems: 10, rewardFate: 5 },
  { key: "level_25",        name: "传说之名",   description: "等级达到 25 级",           tier: "legendary", category: "milestone",  trigger: "level:25",               emoji: "🌌", rewardGold: 1500, rewardGems: 20, rewardFate: 10 },
  { key: "tasks_500",       name: "千锤百炼",   description: "累计完成 500 个任务",      tier: "legendary", category: "cumulative", trigger: "task_done_count:500",    emoji: "💫", rewardGold: 1000, rewardGems: 15, rewardFate: 5 },

  // ---------- BP / Weekly Review ----------
  { key: "weekly_review_1", name: "周日仪式",   description: "完成第 1 次每周复盘",      tier: "silver", category: "milestone",  trigger: "weekly_review_count:1",  emoji: "📅", rewardGold: 100, rewardGems: 1, rewardFate: 1 },
  { key: "weekly_review_4", name: "节律者",     description: "完成 4 次每周复盘",        tier: "gold",   category: "cumulative", trigger: "weekly_review_count:4",  emoji: "🌙", rewardGold: 300, rewardGems: 3, rewardFate: 2 },
  { key: "bp_level_10",    name: "战令之途",   description: "本周战令达到 Lv.10",       tier: "gold",   category: "milestone",  trigger: "bp_level_max:10",        emoji: "🎫", rewardGold: 200, rewardGems: 2, rewardFate: 1 },
  { key: "bp_level_20",    name: "战令满级",   description: "本周战令达到 Lv.20 满级",  tier: "legendary", category: "milestone",  trigger: "bp_level_max:20",        emoji: "🏆", rewardGold: 800, rewardGems: 8, rewardFate: 4 },

  // ---------- Phase 4: Decision Engine ----------
  { key: "first_principle",   name: "立志立言",     description: "写下第 1 条原则",                tier: "bronze",    category: "milestone",  trigger: "principle_count:1",          emoji: "📜", rewardGold: 20, rewardFate: 1 },
  { key: "principles_5",      name: "五大支柱",     description: "原则库累计 5 条",                tier: "silver",    category: "cumulative", trigger: "principle_count:5",          emoji: "🏛️", rewardGold: 80,  rewardGems: 1 },
  { key: "principles_15",     name: "智者之书",     description: "原则库累计 15 条",               tier: "gold",      category: "cumulative", trigger: "principle_count:15",         emoji: "📚", rewardGold: 250, rewardGems: 3, rewardFate: 1 },
  { key: "first_decision",    name: "落笔有痕",     description: "记录第 1 个决策",                tier: "bronze",    category: "milestone",  trigger: "decision_count:1",           emoji: "🧭", rewardGold: 20, rewardFate: 1 },
  { key: "decisions_10",      name: "深思熟虑",     description: "累计记录 10 个决策",             tier: "silver",    category: "cumulative", trigger: "decision_count:10",          emoji: "🗺️", rewardGold: 100, rewardGems: 1, rewardFate: 2 },
  { key: "first_postmortem",  name: "回望初心",     description: "完成第 1 次决策复盘 (Post-mortem)", tier: "silver",    category: "milestone",  trigger: "decision_reviewed_count:1",  emoji: "🔍", rewardGold: 60, rewardGems: 1, rewardFate: 2 },
  { key: "postmortem_10",     name: "经验沉淀",     description: "累计完成 10 次决策复盘",         tier: "gold",      category: "cumulative", trigger: "decision_reviewed_count:10", emoji: "🪞", rewardGold: 300, rewardGems: 3, rewardFate: 3 },
  { key: "dalio_disciple",    name: "Dalio 门徒",   description: "累计 30 次决策复盘 · 你已建立自己的算法", tier: "legendary", category: "cumulative", trigger: "decision_reviewed_count:30", emoji: "🌌", rewardGold: 1200, rewardGems: 15, rewardFate: 8 },

  // ---------- Knowledge Base ----------
  { key: "first_note",        name: "落字成金",     description: "写下第 1 条笔记",                tier: "bronze",    category: "milestone",  trigger: "note_count:1",            emoji: "📓", rewardGold: 15, rewardFate: 1 },
  { key: "notes_25",          name: "学者初成",     description: "知识库累计 25 条",                tier: "silver",    category: "cumulative", trigger: "note_count:25",           emoji: "📚", rewardGold: 100, rewardGems: 1, rewardFate: 2 },
  { key: "notes_100",         name: "第二大脑",     description: "知识库累计 100 条 · 你的大脑有了双备份",   tier: "gold",      category: "cumulative", trigger: "note_count:100",          emoji: "🧠", rewardGold: 400, rewardGems: 4, rewardFate: 3 },
];

/**
 * Titles — global definitions, each tied to a specific achievement key.
 * When the source achievement unlocks for a user, the matching title also unlocks.
 * User can equip ONE at a time (User.equippedTitleKey) — shows in TopNav.
 */
const TITLES = [
  // Bronze — entry tier
  { key: "title_initiate",   name: "初心者",     description: "完成第 1 个任务即可解锁", emoji: "🌱", tier: "bronze",    sourceAchievementKey: "first_task" },
  { key: "title_dawn",       name: "晨型人",     description: "完成第 1 个日程即可解锁", emoji: "🔆", tier: "bronze",    sourceAchievementKey: "first_routine" },
  { key: "title_reflector",  name: "回望者",     description: "完成第 1 次每日复盘即可解锁", emoji: "📖", tier: "bronze", sourceAchievementKey: "first_review" },

  // Silver
  { key: "title_streaker",   name: "七连勇者",   description: "任一日程连击 7 天解锁", emoji: "🔥", tier: "silver",      sourceAchievementKey: "streak_7" },
  { key: "title_diligent",   name: "勤恳行者",   description: "累计完成 50 个任务解锁", emoji: "⚒️", tier: "silver",     sourceAchievementKey: "tasks_50" },
  { key: "title_apprentice", name: "学徒",       description: "等级达到 5 级解锁", emoji: "⭐", tier: "silver",          sourceAchievementKey: "level_5" },
  { key: "title_writer",     name: "笔耕者",     description: "完成 7 次每日复盘解锁", emoji: "📓", tier: "silver",      sourceAchievementKey: "review_weekly" },
  { key: "title_pillars",    name: "立柱者",     description: "原则库累计 5 条解锁", emoji: "🏛️", tier: "silver",       sourceAchievementKey: "principles_5" },

  // Gold
  { key: "title_iron",       name: "铁人",       description: "日程连击 30 天解锁", emoji: "🌟", tier: "gold",            sourceAchievementKey: "streak_30" },
  { key: "title_strategist", name: "战略家",     description: "完成第 1 个 OKR 目标解锁", emoji: "🎯", tier: "gold",      sourceAchievementKey: "first_goal" },
  { key: "title_builder",    name: "工匠",       description: "完成第 1 个项目解锁", emoji: "🏗️", tier: "gold",         sourceAchievementKey: "first_project" },
  { key: "title_adept",      name: "登堂者",     description: "等级达到 10 级解锁", emoji: "👑", tier: "gold",            sourceAchievementKey: "level_10" },
  { key: "title_rhythm",     name: "节律者",     description: "完成 4 次每周复盘解锁", emoji: "🌙", tier: "gold",         sourceAchievementKey: "weekly_review_4" },
  { key: "title_sage",       name: "智者",       description: "原则库累计 15 条解锁", emoji: "📚", tier: "gold",          sourceAchievementKey: "principles_15" },
  { key: "title_seasoned",   name: "经验丰富",   description: "完成 10 次决策复盘解锁", emoji: "🪞", tier: "gold",       sourceAchievementKey: "postmortem_10" },

  // Legendary
  { key: "title_centurion",  name: "百日勇者",   description: "日程连击 100 天解锁", emoji: "👑", tier: "legendary",     sourceAchievementKey: "streak_100" },
  { key: "title_legend",     name: "传说之名",   description: "等级达到 25 级解锁", emoji: "🌌", tier: "legendary",      sourceAchievementKey: "level_25" },
  { key: "title_disciple",   name: "Dalio 门徒", description: "累计 30 次决策复盘解锁", emoji: "🌌", tier: "legendary",  sourceAchievementKey: "dalio_disciple" },
  { key: "title_bp_master",  name: "战令满级",   description: "本周战令达到 Lv.20 满级解锁", emoji: "🏆", tier: "legendary", sourceAchievementKey: "bp_level_20" },
  { key: "title_master",     name: "千锤百炼",   description: "累计完成 500 个任务解锁", emoji: "💫", tier: "legendary", sourceAchievementKey: "tasks_500" },
];

/**
 * Equipment / Avatar Frames — global catalog. v1 ships frame slot only.
 * Sources:
 *   seed         — granted to every user on first signup (basic frame)
 *   achievement  — unlocked by safeCheck cascade (mirrors Title cascade)
 *   event        — unlocked when an Event's bonus completes
 */
const EQUIPMENT = [
  // Common — everyone starts with these
  { key: "frame_default",    name: "默认相框",   description: "新玩家初始相框",                          tier: "common",    slot: "frame", source: "seed",        sourceKey: null,                   emoji: "○", style: JSON.stringify({ gradient: ["#b68838", "#d4a94d"], strokeWidth: 1 }) },
  { key: "frame_parchment",  name: "米纸边",     description: "薄金边 + 米纸纹理 · 内置赠送",                tier: "common",    slot: "frame", source: "seed",        sourceKey: null,                   emoji: "▢", style: JSON.stringify({ gradient: ["#e8c977", "#b68838"], strokeWidth: 2 }) },

  // Rare — unlocked by silver-tier achievements
  { key: "frame_streaker",   name: "七连之环",   description: "连续 7 天日程解锁",                     tier: "rare",      slot: "frame", source: "achievement", sourceKey: "streak_7",             emoji: "🔥", style: JSON.stringify({ gradient: ["#c5554a", "#f0a05a"], strokeWidth: 2, glow: "#c5554a" }) },
  { key: "frame_apprentice", name: "学徒之环",   description: "等级 5 解锁",                          tier: "rare",      slot: "frame", source: "achievement", sourceKey: "level_5",              emoji: "⭐", style: JSON.stringify({ gradient: ["#3a6b8e", "#a8d0e6"], strokeWidth: 2 }) },

  // Epic — unlocked by gold achievements
  { key: "frame_iron",       name: "铁人之环",   description: "连续 30 天日程解锁",                    tier: "epic",      slot: "frame", source: "achievement", sourceKey: "streak_30",            emoji: "🌟", style: JSON.stringify({ gradient: ["#8a6820", "#d4a94d"], strokeWidth: 3, ornament: "diamond", glow: "#d4a94d" }) },
  { key: "frame_strategist", name: "战略家纹章", description: "完成第 1 个 OKR 目标解锁",              tier: "epic",      slot: "frame", source: "achievement", sourceKey: "first_goal",           emoji: "🎯", style: JSON.stringify({ gradient: ["#4c8a74", "#a3d9c0"], strokeWidth: 3, ornament: "stars" }) },
  { key: "frame_sage",       name: "智者书脊",   description: "原则库累计 15 条解锁",                  tier: "epic",      slot: "frame", source: "achievement", sourceKey: "principles_15",        emoji: "📚", style: JSON.stringify({ gradient: ["#9b6bc1", "#d4b9f0"], strokeWidth: 3, ornament: "ring" }) },

  // Legendary — top-tier; one is event-locked
  { key: "frame_centurion",  name: "百日加冕",   description: "连续 100 天日程解锁",                  tier: "legendary", slot: "frame", source: "achievement", sourceKey: "streak_100",           emoji: "👑", style: JSON.stringify({ gradient: ["#d4a94d", "#fff5c4"], strokeWidth: 4, ornament: "spark", glow: "#fff5c4" }) },
  { key: "frame_dalio",      name: "Dalio 之纹", description: "30 次决策复盘解锁",                    tier: "legendary", slot: "frame", source: "achievement", sourceKey: "dalio_disciple",       emoji: "🌌", style: JSON.stringify({ gradient: ["#1b2634", "#9b6bc1"], strokeWidth: 4, ornament: "stars", glow: "#9b6bc1" }) },
  { key: "frame_spring",     name: "春之觉醒",   description: "完成春之觉醒活动全部任务解锁",          tier: "legendary", slot: "frame", source: "event",       sourceKey: "spring_awakening_2026", emoji: "🌸", style: JSON.stringify({ gradient: ["#c76d95", "#fff0e0"], strokeWidth: 4, ornament: "wave", glow: "#c76d95" }) },
];

/**
 * Limited-time Events — manually-curated. Users see active + upcoming + past
 * on /events. Missions track metric counts within the event window.
 */
function eventsForSeed() {
  const now = new Date();
  // 14-day Spring Awakening window starting today
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 14);

  // 7-day Quarterly Push starting in 7 days
  const upStart = new Date(start);
  upStart.setDate(upStart.getDate() + 7);
  const upEnd = new Date(upStart);
  upEnd.setDate(upEnd.getDate() + 7);

  return [
    {
      key: "spring_awakening_2026",
      name: "春之觉醒",
      description: "14 天的执行 + 复盘 + 决策三路并进 · 完成全部解锁春之觉醒相框",
      emoji: "🌸",
      themeColor: "#c76d95",
      startsAt: start,
      endsAt: end,
      missions: JSON.stringify([
        { key: "tasks",     title: "完成 20 个任务",      metric: "task_done",       target: 20, emoji: "✅", xpReward: 100, goldReward: 30 },
        { key: "routines",  title: "完成 25 个日程",      metric: "routine_done",    target: 25, emoji: "🔁", xpReward: 100, goldReward: 30 },
        { key: "habits",    title: "正向习惯打卡 30 次",  metric: "habit_tick",      target: 30, emoji: "🔥", xpReward: 100, goldReward: 30 },
        { key: "reviews",   title: "完成 7 次每日复盘",   metric: "daily_review",    target: 7,  emoji: "📖", xpReward: 150, goldReward: 50, fateReward: 2 },
        { key: "decisions", title: "记录或复盘 3 个决策", metric: "decision_logged", target: 3,  emoji: "🧭", xpReward: 200, goldReward: 60, gemsReward: 1 },
      ]),
      bonusXp: 800,
      bonusGold: 250,
      bonusGems: 5,
      bonusFate: 5,
      bonusEquipmentKey: "frame_spring",
    },
    {
      key: "quarterly_sprint_q2",
      name: "季度冲刺 Q2",
      description: "7 天战略冲刺 · 推动 OKR + 项目 + 决策",
      emoji: "🚀",
      themeColor: "#3a6b8e",
      startsAt: upStart,
      endsAt: upEnd,
      missions: JSON.stringify([
        { key: "goal",      title: "完成 1 个 OKR 目标",  metric: "goal_done",       target: 1, emoji: "🎯", xpReward: 300, goldReward: 100, gemsReward: 2 },
        { key: "projects",  title: "完成 1 个项目",       metric: "project_done",    target: 1, emoji: "🏗️", xpReward: 200, goldReward: 80,  gemsReward: 1 },
        { key: "weekly",    title: "完成本周复盘",        metric: "weekly_review",   target: 1, emoji: "📓", xpReward: 150, goldReward: 50,  fateReward: 1 },
        { key: "principles",title: "新增 1 条原则",       metric: "principle_added", target: 1, emoji: "📜", xpReward: 100, goldReward: 30,  fateReward: 1 },
      ]),
      bonusXp: 600,
      bonusGold: 200,
      bonusGems: 3,
      bonusFate: 3,
      bonusEquipmentKey: null,
    },
  ];
}

/**
 * Default Principles seeded for new users — drawn from Dalio + Heath WRAP + Atomic Habits.
 * User can edit/archive/delete; intent is to give a starting palette, not be canonical.
 */
const DEFAULT_PRINCIPLES = [
  {
    title: "Pain + Reflection = Progress",
    body: "把痛苦当成数据。每一次失败/挫折都必须写下来复盘——不复盘的痛苦是浪费。",
    emoji: "🔥",
    category: "decision",
    source: "Dalio · Principles",
  },
  {
    title: "Expected Value 思维",
    body: "每个决策当成一个赌注：EV = 概率 × 回报 − (1 − 概率) × 损失。EV 为正就值得做，结果好坏不等于决策好坏。",
    emoji: "🎲",
    category: "decision",
    source: "Dalio · Principles",
  },
  {
    title: "10-10-10 Rule",
    body: "做重大决定前问自己：10 分钟后、10 个月后、10 年后我会怎么看这个选择？短期情绪不应该主导长期决策。",
    emoji: "⏳",
    category: "decision",
    source: "Heath · WRAP",
  },
  {
    title: "Pre-mortem 预设失败",
    body: "假设这个计划半年后失败了，最可能是什么原因？提前想清楚失败模式，是避免失败最便宜的办法。",
    emoji: "⚠️",
    category: "decision",
    source: "Heath · WRAP",
  },
  {
    title: "身份 > 结果",
    body: "「我是一个写作者」比「我要写一本书」更持久。习惯的根是身份认同，不是目标列表。",
    emoji: "🎭",
    category: "life",
    source: "Atomic Habits",
  },
];

/**
 * Default reward items — user can edit/add. Tier guides gacha rarity.
 */
const REWARDS = [
  // Common (Gold)
  { name: "一杯精品咖啡", emoji: "☕", tier: "common", costGold: 30,  description: "犒劳自己一杯精品咖啡或奶茶。" },
  { name: "30分钟自由时间", emoji: "🪁", tier: "common", costGold: 40,  description: "什么都不做，纯粹放空 30 分钟。" },
  { name: "看一集喜欢的剧", emoji: "📺", tier: "common", costGold: 50,  description: "无负罪感地看一集你想看的剧。" },
  { name: "外卖小奖励",   emoji: "🍱", tier: "common", costGold: 60,  description: "点一份你想吃的外卖。" },

  // Rare (Gold + Gems)
  { name: "买一本心仪的书", emoji: "📘", tier: "rare", costGold: 200, costGems: 1, description: "买你想读的那本书。" },
  { name: "下馆子吃一顿", emoji: "🍣", tier: "rare", costGold: 300, costGems: 2, description: "去你最喜欢那家餐厅吃顿好的。" },
  { name: "一次按摩",     emoji: "💆", tier: "rare", costGold: 400, costGems: 2, description: "去按摩放松一下。" },

  // Epic (Gems heavy)
  { name: "周末短途旅行", emoji: "🗺️", tier: "epic", costGold: 800, costGems: 8, description: "安排一个周末的小旅行。" },
  { name: "买一件想要的好物", emoji: "🎁", tier: "epic", costGold: 1000, costGems: 10, description: "下单那件犹豫已久的好东西。" },

  // Legendary (Big gems + fate)
  { name: "换新设备", emoji: "💻", tier: "legendary", costGold: 3000, costGems: 30, description: "升级你需要的关键设备。" },
  { name: "出国旅行预算", emoji: "✈️", tier: "legendary", costGold: 5000, costGems: 50, description: "为下一次出国旅行划拨预算。" },
];

async function main() {
  // ---------- Achievements (global) ----------
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      create: a,
      update: { ...a },
    });
  }
  console.log(`Seeded ${ACHIEVEMENTS.length} achievement definitions.`);

  // ---------- Titles (global) ----------
  for (const t of TITLES) {
    await prisma.title.upsert({
      where: { key: t.key },
      create: t,
      update: { ...t },
    });
  }
  console.log(`Seeded ${TITLES.length} title definitions.`);

  // ---------- Equipment / Avatar Frames (global) ----------
  for (const e of EQUIPMENT) {
    await prisma.equipment.upsert({
      where: { key: e.key },
      create: e,
      update: { ...e },
    });
  }
  console.log(`Seeded ${EQUIPMENT.length} equipment definitions.`);

  // ---------- Events (global) ----------
  // upsert by key — but startsAt/endsAt should NOT be reset on every seed
  // run, otherwise running seed pushes the window forward repeatedly.
  for (const ev of eventsForSeed()) {
    const existing = await prisma.event.findUnique({ where: { key: ev.key } });
    if (existing) {
      // Refresh metadata only (name/desc/missions can evolve), keep dates
      await prisma.event.update({
        where: { key: ev.key },
        data: {
          name: ev.name,
          description: ev.description,
          emoji: ev.emoji,
          themeColor: ev.themeColor,
          missions: ev.missions,
          bonusXp: ev.bonusXp,
          bonusGold: ev.bonusGold,
          bonusGems: ev.bonusGems,
          bonusFate: ev.bonusFate,
          bonusEquipmentKey: ev.bonusEquipmentKey,
        },
      });
    } else {
      await prisma.event.create({ data: ev });
    }
  }
  console.log(`Seeded events.`);

  // ---------- User + per-user defaults ----------
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Player One",
        class: "Scholar",
        currency: { create: {} },
        freezeStash: { create: { count: 2 } },
        areas: { create: DEFAULT_AREAS.map((a) => ({ ...a })) },
      },
    });
    console.log(`Seeded new user ${user.id}.`);
  } else {
    console.log(`User exists: ${user.id}`);
    // Ensure freezeStash row exists for existing users
    await prisma.streakFreeze.upsert({
      where: { userId: user.id },
      create: { userId: user.id, count: 2 },
      update: {},
    });
  }

  // ---------- Default reward items ----------
  const existingRewards = await prisma.rewardItem.count({ where: { userId: user.id } });
  if (existingRewards === 0) {
    await prisma.rewardItem.createMany({
      data: REWARDS.map((r) => ({ ...r, userId: user.id })),
    });
    console.log(`Seeded ${REWARDS.length} default reward items.`);
  }

  // ---------- Default Principles (Phase 4) ----------
  const existingPrinciples = await prisma.principle.count({ where: { userId: user.id } });
  if (existingPrinciples === 0) {
    await prisma.principle.createMany({
      data: DEFAULT_PRINCIPLES.map((p) => ({ ...p, userId: user.id })),
    });
    console.log(`Seeded ${DEFAULT_PRINCIPLES.length} default principles.`);
  }

  // ---------- Grant seed-source Equipment to existing user ----------
  const seedEquipment = await prisma.equipment.findMany({ where: { source: "seed" } });
  for (const eq of seedEquipment) {
    try {
      await prisma.userEquipment.create({ data: { userId: user.id, equipmentKey: eq.key } });
    } catch {
      // unique-constraint duplicate — skip
    }
  }
  // Default-equip the basic frame if user has nothing equipped
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { equippedFrameKey: true } });
  if (!u?.equippedFrameKey) {
    await prisma.user.update({
      where: { id: user.id },
      data: { equippedFrameKey: "frame_parchment" },
    });
  }

  // ---------- Backfill achievement-source Equipment for already-unlocked achievements ----------
  const allEquipment = await prisma.equipment.findMany({ where: { source: "achievement" } });
  const eqUserAchUnlocks = await prisma.achievementUnlock.findMany({
    where: { userId: user.id },
    include: { achievement: true },
  });
  const eqUnlockedAchKeys = new Set(eqUserAchUnlocks.map((u) => u.achievement.key));
  const eqToBackfill = allEquipment.filter((e) => e.sourceKey && eqUnlockedAchKeys.has(e.sourceKey));
  if (eqToBackfill.length > 0) {
    let added = 0;
    for (const eq of eqToBackfill) {
      try {
        await prisma.userEquipment.create({ data: { userId: user.id, equipmentKey: eq.key } });
        added++;
      } catch {
        // duplicate
      }
    }
    if (added > 0) console.log(`Backfilled ${added} achievement-source equipment.`);
  }

  // ---------- Backfill UserTitle from existing achievement unlocks ----------
  // Any user who has already unlocked the source achievement should have the
  // matching title unlocked too. Idempotent — relies on unique [userId, titleKey].
  const allTitles = await prisma.title.findMany();
  const userUnlocks = await prisma.achievementUnlock.findMany({
    where: { userId: user.id },
    include: { achievement: true },
  });
  const unlockedAchKeys = new Set(userUnlocks.map((u) => u.achievement.key));
  const titlesToBackfill = allTitles.filter((t) => unlockedAchKeys.has(t.sourceAchievementKey));
  if (titlesToBackfill.length > 0) {
    let added = 0;
    for (const t of titlesToBackfill) {
      try {
        await prisma.userTitle.create({ data: { userId: user.id, titleKey: t.key } });
        added++;
      } catch (e) {
        // Likely race or duplicate (unique [userId, titleKey]) — skip.
        if (!(e instanceof Error && e.message.includes("Unique"))) throw e;
      }
    }
    if (added > 0) console.log(`Backfilled ${added} titles for existing user.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
