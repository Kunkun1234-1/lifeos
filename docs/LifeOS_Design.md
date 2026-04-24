# LifeOS：人生管理系统设计文档

> 一份基于生产力方法论、行为科学、游戏奖励设计的综合调研与系统架构提案
>
> 目标：宏观辅助决策 · 微观让生活井井有条 · 持续迭代优化 · Web 形态呈现

---

## 0. TL;DR（一分钟版本）

LifeOS 的核心不是"好看的待办列表"，而是三个相互咬合的引擎：

1. **决策引擎（宏观）**：把人生拆成 `Vision → Areas → Goals(OKR) → Projects → Tasks/Habits`，并配套"决策日志 + Principles 库 + 复盘系统"，让每一次重要选择都有据可查、可复盘。
2. **执行引擎（微观）**：PARA + GTD 的信息 / 任务流，加上游戏化的即时反馈层（XP、等级、属性、货币、成就、连击）。
3. **奖励引擎（上瘾机制）**：偷师《原神》的**五层节奏**——日委托（Daily）/ Resin（精力限制）/ BP（周期性）/ 抽卡（变奖励）/ 活动（限时）——把"做正确的事"变成"忍不住打开看看"。

Web 实现栈推荐：**Next.js + TypeScript + Tailwind + Postgres + Prisma + Zustand**，辅以 Claude/LLM API 做智能复盘与教练。

---

## 1. 调研综述

### 1.1 生产力方法论（横向扫描）

| 方法论 | 作者 / 出处 | 核心主张 | 对 LifeOS 的启发 |
|---|---|---|---|
| **PARA** | Tiago Forte《Building a Second Brain》 | 所有信息按可操作性分为 Projects / Areas / Resources / Archives | 成为 LifeOS 信息层的骨架 |
| **GTD** | David Allen《Getting Things Done》 | Capture → Clarify → Organize → Reflect → Engage，"大脑用来思考，不是用来记住" | 成为任务处理的核心流水线 |
| **OKR（个人版）** | John Doerr / Andy Grove | Objective 定方向 + Key Results 定度量 | 成为目标层的定义语言 |
| **Atomic Habits** | James Clear | 四定律：Make it obvious / attractive / easy / satisfying；身份认同 > 结果目标 | 成为习惯模块的设计准则 |
| **12 Week Year** | Brian Moran | 把年拆成 4 个 12 周冲刺，避免年度目标虚设 | 成为季度 Sprint 的节奏 |
| **Weekly Review** | David Allen | 每周回看日历 + 任务，闭环未决事项 | 成为每周强制节点 |
| **Feel-Good Productivity** | Ali Abdaal | 生产力的秘密是 Joy（Play / Power / People） | 为游戏化模块提供"为什么" |
| **PPV（Pillars, Pipelines, Vaults）** | August Bradley | 价值观→流程→资产库的三层 Notion 系统 | 作为分层架构的参考 |

**规律**：所有可持续的系统都遵循一个相同的骨架——**"愿景 → 分解 → 行动 → 复盘 → 再分解"** 的循环。差别只在工具的繁简。

### 1.2 心理学与行为科学

#### 1.2.1 Habit Loop（习惯回路）

Charles Duhigg 在《The Power of Habit》、James Clear 在《Atomic Habits》里把习惯拆成四步：

```
Cue（提示） → Craving（渴望） → Response（行为） → Reward（奖励）
```

- **没有 Cue，习惯不会启动**
- **没有 Craving，没有行动欲望**
- **没有 Response，就没有行为本身**
- **没有 Reward，大脑不会把它记下来"下次再做"**

LifeOS 必须对四环节都做设计，而不是只盯着"任务完成"。

#### 1.2.2 Hook Model（Nir Eyal《Hooked》）

```
Trigger → Action → Variable Reward → Investment
```

关键洞察：**可预测的奖励让多巴胺稳定；不可预测的奖励让多巴胺飙升**。这就是为什么刷手机、抽卡、社交点赞都让人上瘾。

Nir Eyal 把变奖励分三类——这对 LifeOS 的奖励设计至关重要：
- **Tribe（部落奖励）**：社交验证，点赞、评论、"别人也在做"
- **Hunt（狩猎奖励）**：资源、信息、成就——永无止境地搜寻
- **Self（自我奖励）**：技艺精进、完成感、掌控感

一个好的 LifeOS 应该**三类都提供**。

#### 1.2.3 Dopamine 的真相

> "Dopamine is released not only when you experience pleasure, but also when you **anticipate** it. It is the **anticipation** of a reward—not the fulfillment of it—that gets us to take action." — James Clear

含义：**期待 > 得到**。所以真正让人上头的不是"我完成了任务"，而是"我快要完成了"、"今天会不会出金"、"解锁了新角色"。

#### 1.2.4 Endowed Progress Effect

人对"已经有一些进展"的目标，更愿意去完成。Genshin 的每一个数值条都在利用这个效应——让你永远觉得"差一点点就到了"。

### 1.3 游戏奖励机制深度拆解

#### 1.3.1 《原神》的五层奖励节奏

这是 miHoYo 最被低估的设计智慧。Genshin 不只是一个游戏，它是一个**多时间尺度的习惯工程**：

| 层次 | 周期 | 机制 | 玩家心理 |
|---|---|---|---|
| **Resin（树脂）** | 每 8 分钟回 1 点，上限 200 | 限制高价值副本的频次 | "浪费就是亏" → 每天至少登两次 |
| **Daily Commission** | 每日 4 个委托，60 原石 | 轻量日任务 | "不做就亏了"的日常触发器 |
| **Weekly Boss / BP** | 每周 3 个周本 + BP 周任务 | 中周期里程碑 | "周末要冲一把" |
| **Battle Pass / Events** | 每 6 周一个版本 | 活动 + 剧情 + 奖励包 | "这版别漏" |
| **Banner（抽卡）** | 限时角色池 | 变比率奖励 + 保底（75 软保 / 90 硬保） | "就快出金了" |

**洞察**：单一节奏（比如只有日任务）会枯燥；单一变奖励（只有抽卡）会焦虑。**多节奏叠加**才能让玩家在任何时间尺度上都有事做。

#### 1.3.2 Habitica 的 RPG 式生活化

Habitica 的三分法非常经典：
- **Habits（习惯）**：可加/可减分，没有固定时间（比如"多喝水" +、 "抽烟" -）
- **Dailies（日常）**：每日必做，**未完成会扣 HP**（这是关键的"损失厌恶"杠杆）
- **To-Dos（一次性）**：只奖不罚，越拖越多奖励

玩家获得：
- **XP** → 升级
- **金币** → 买装备/道具
- **HP** → 因不完成 Dailies 而降，归零则"死亡"、掉级、掉装备
- **MP** → 法力，用于技能（职业系统：战士/法师/盗贼/治疗）
- **宠物、坐骑、装备** → 收集元素

**Habitica 故意不做公开 Leaderboard**——避免恶性竞争，保护自我提升者的心态。这是 LifeOS 值得照抄的价值观。

#### 1.3.3 成功模板的共性（以中文社区为例）

从「人生无限公司 Life·X」、「喵星探险记」、「Life OKR System」等模板看，普遍套路：

- **角色面板**：等级、XP、战斗力、称号、成就徽章
- **领域 = 部门**：健康部、职业部、学习部、财务部……每个部门独立分数
- **虚拟货币**：做事赚"星币"，用于兑换真实奖励（吃大餐、买东西、休息一天）
- **项目 = 关卡**：拆解为子任务
- **复盘 = 剧情回顾**：周 / 月 / 年

这个套路已经被充分验证有效，你可以放心用。

### 1.4 决策框架

#### 1.4.1 Ray Dalio《Principles》的 5 步流程

```
1. Goals（明确目标）
2. Problems（识别阻碍）  
3. Diagnosis（根因诊断）
4. Design（设计方案）
5. Do（执行）
↺ 循环
```

关键概念：
- **Believability-Weighted Decision Making**：不是民主投票，而是按"在该领域的可信度"加权
- **Pain + Reflection = Progress**：把痛苦当成数据，必须写下来复盘
- **Expected Value 思维**：每个决策当成一个赌注（概率 × 回报 − 概率 × 惩罚）
- **Diversify**：不相关的好赌注组合起来，可以降低 80% 风险而不牺牲上行

Dalio 自己把这些 Principles 做成了决策算法输入电脑——**这正是 LifeOS 可以实现的**。

#### 1.4.2 Heath 兄弟的 WRAP 模型

针对个人决策的四大陷阱：

- **W**iden your options（避免狭隘框架）→ "除了 A 和 B，还有没有 C？"
- **R**eality-test your assumptions（避免确认偏误）→ 做 ooching（小型实验）
- **A**ttain distance before deciding（避免短期情绪）→ 10-10-10 rule（10 分钟、10 个月、10 年后你会怎么看？）
- **P**repare to be wrong（避免过度自信）→ Pre-mortem，预设失败原因

#### 1.4.3 Eisenhower Matrix

经典的 Urgent × Important 四象限，适合做**任务优先级**，但不适合做战略决策。LifeOS 可以用它做日/周视图的筛选器。

### 1.5 数据与反馈

成功案例里有一个共同点：**他们都在"跟踪自己"**。

- Benjamin Franklin 的 13 美德日记
- Jerry Seinfeld 的写笑话连胜（"Don't break the chain"）
- Trent Dyrsmid 用回形针追踪销售电话次数
- 《Atomic Habits》推荐的 habit tracker：(1) 视觉提示 (2) 激励 (3) 完成时满足

**关键启示**：追踪本身就是奖励。所以 LifeOS 必须是"看得见进步"的。

---

## 2. 核心设计原则

在进入架构之前，先定 9 条不可违背的原则。这些来自调研中踩过的所有坑：

1. **分层但不臃肿**：6 层架构是骨架，但普通用户应该只需要用 2-3 层就能获得价值。
2. **系统 > 目标**：追踪"你做了多少"，而不是"你达成了多少"（Clear 的身份认同导向）。
3. **默认触发 > 意志力**：靠环境设计（cue）驱动行为，而不是靠每天早上立 flag。
4. **即时反馈 > 延迟回报**：每一次任务完成都必须有立刻可见的视觉/数值反馈。
5. **多层节奏**：日 + 周 + 月 + 季 + 年五个时间尺度都要有进度条。
6. **变奖励必须有价值挂钩**：抽卡出的不是废品，而是真实兑换券/成就/解锁。
7. **负反馈要轻**：Habitica 的"死亡掉级"对很多人是退出诱因，LifeOS 默认应该只有衰减（streak 断）而非惩罚。
8. **社交可选、排行榜默认关**：保护自我提升者的心态。
9. **复盘是核心功能而非附加**：每周必填复盘 = 系统能"学"你；不复盘，LifeOS 就是昂贵的待办清单。

---

## 3. 系统架构：六层分解

```
┌─────────────────────────────────────────────┐
│ Layer 6: Review & Iteration（复盘迭代层）    │ ← 周/月/季/年复盘
├─────────────────────────────────────────────┤
│ Layer 5: Execution（执行层）                │ ← Tasks, Habits, Routines
├─────────────────────────────────────────────┤
│ Layer 4: Projects（项目层）                 │ ← PARA-P
├─────────────────────────────────────────────┤
│ Layer 3: Goals / OKRs（目标层）             │ ← 季度/年度 OKR
├─────────────────────────────────────────────┤
│ Layer 2: Life Areas（领域层）               │ ← PARA-A；游戏化中的"部门"
├─────────────────────────────────────────────┤
│ Layer 1: Identity & Vision（身份愿景层）    │ ← 你要成为什么样的人
└─────────────────────────────────────────────┘

         ╳ 交叉叠加 ╳

┌─────────────────────────────────────────────┐
│ Gamification Engine（游戏化引擎）           │
│  • Avatar & Attributes                      │
│  • XP / Level / Currency                    │
│  • Daily Commissions / Weekly BP / Events   │
│  • Achievements / Streaks / Loot            │
├─────────────────────────────────────────────┤
│ Decision Support（决策辅助）                │
│  • Principles Library                       │
│  • Decision Journal                         │
│  • Weighted Matrix / EV Calculator          │
│  • Pre-mortem & Post-mortem                 │
├─────────────────────────────────────────────┤
│ Knowledge Base（第二大脑）                  │
│  • Resources（PARA-R）                      │
│  • Notes / Highlights / Inspirations        │
│  • Linked via Areas & Projects              │
├─────────────────────────────────────────────┤
│ Analytics（数据层）                         │
│  • Heatmaps / Trends / Correlations         │
│  • Time allocation vs. Mood / Energy        │
└─────────────────────────────────────────────┘
```

### 3.1 Layer 1：Identity & Vision（身份愿景层）

**要解决的问题**：绝大多数待办系统的根本缺陷是"做事情但不知道为什么"。

**功能**：
- 3-5 条 Core Values（核心价值观）
- 1 条 10 年愿景陈述
- 3-5 条"我要成为什么样的人"的身份宣言（Identity Statements），如 _"我是一个写作者"_ 而非 _"我要写书"_
- 与 Areas / Goals 双向关联：每个目标都能回溯到"为什么"

**游戏化映射**：这是**角色职业选择**。你是战士/法师/盗贼/工程师/艺术家……

### 3.2 Layer 2：Life Areas（领域层）

**功能**：PARA 中的 Areas——你要长期维持标准的生活领域。

典型 5-7 个：
- 💪 Health（健康）
- 🧠 Learning / Career（学习与职业）
- 💰 Finance（财务）
- ❤️ Relationships（关系）
- 🎨 Creative / Hobbies（创造与兴趣）
- 🏠 Home / Admin（生活事务）
- 🧘 Mind / Wellbeing（心智与幸福）

**每个 Area 有**：
- 独立的 Health Score（0-100，根据最近 N 周的执行数据计算）
- 专属的 XP 池（游戏化：就像"健康部门经验值"）
- 关联的 Goals、Projects、Habits、Resources
- 定期检视节奏（每月一次 Area Review）

**游戏化映射**：**属性条**。Health = 体质；Learning = 智力；Finance = 财富；Relationships = 魅力；Creative = 灵感；Wellbeing = 心力。这直接对应 RPG 的六维属性。

### 3.3 Layer 3：Goals / OKRs（目标层）

**功能**：季度 + 年度目标，用 OKR 语法。

```
Objective: 成为一名能独立发布产品的全栈开发者
  KR1: 完成 1 个上线的全栈项目（含前后端+部署）
  KR2: 累计贡献 ≥ 20 次开源 PR
  KR3: 输出 10 篇技术文章
```

**数据属性**：
- Timeframe（Q1/Q2/Q3/Q4 / Year）
- Parent Area（关联到领域）
- Progress（自动 rollup from KRs）
- Confidence（每周主观打分 1-10）
- Reflection notes

**游戏化映射**：**主线剧情**。每个 Objective 是一条主线任务链，KR 是任务阶段。

### 3.4 Layer 4：Projects（项目层）

PARA 的 P。**有终点、有产出的短期努力**。例子：
- "写完我的毕业论文"
- "装修阳台"
- "学会弹《River Flows in You》"
- "办一次 20 人的读书会"

**数据属性**：
- Status（Idea / Active / Paused / Done / Archived）
- Area, Goal（双向关联）
- Deadline, Deliverable
- Tasks（子任务列表）
- Review date

**游戏化映射**：**支线任务 / 副本**。完成可得大额 XP + 货币 + 成就徽章。

### 3.5 Layer 5：Execution（执行层）

这一层是日常触点。三种核心类型（参考 Habitica）：

| 类型 | 定义 | 奖惩 | 典型例子 |
|---|---|---|---|
| **Tasks（一次性任务）** | 一次性、有/无 deadline | 完成+XP / 超期不扣 | "买生日礼物"、"预约体检" |
| **Habits（习惯）** | 想养成或戒除的行为 | 正向+XP / 负向-XP 或减属性 | "写日记"、"不刷短视频" |
| **Routines / Dailies（日程）** | 每日必做的 n 项 | 完成+XP / 未完成 streak 断 | "晨间 30 分钟阅读"、"10k 步" |

**关键设计**：每个执行项必须可以**关联到** Layer 2-4 的上层元素，否则不给推荐出现。这保证"你做的每件小事都是为上层服务的"。

### 3.6 Layer 6：Review & Iteration（复盘层）

**这是最容易被忽视却最关键的一层**。

四个节奏：

#### Daily Review（2-3 分钟）
- 今天 3 件最重要的事做完了吗？
- 情绪、精力、专注 1-10 分
- 一句话记录："今天我…"

#### Weekly Review（20-30 分钟，每周日晚）
- 上周 OKR 进度推进了多少？
- Daily Commissions 完成率？
- Principles 中本周用到了哪些？
- 有哪些决策可以回头看？
- 下周前三件事是什么？

#### Monthly Review（60 分钟）
- 每个 Area 的 Health Score 变化
- 值得保留/增加/减少/停止的（Keep/More/Less/Stop）
- 本月最大收获 / 最大遗憾

#### Quarterly Review（2-3 小时）
- OKR 正式评分（0.0-1.0）
- 下季度 OKR 设定
- 身份宣言是否需要更新
- Principles 库的增改

---

## 4. 游戏化引擎：分层奖励设计

这是本系统的"上瘾层"，直接照搬《原神》的多层节奏 + Habitica 的 RPG 外壳。

### 4.1 角色与属性

```
Avatar
├── Level: 整数（由总 XP 决定）
├── Class: 用户选择（Scholar / Athlete / Artist / Engineer / Connector）
├── Attributes（对应 Life Areas）:
│     STR（体质 ← Health）
│     INT（智力 ← Learning）
│     CHA（魅力 ← Relationships）
│     WIS（心智 ← Wellbeing）
│     CRE（创造 ← Creative）
│     GOLD（财富 ← Finance）
├── Title: 根据成就解锁（"晨型人"、"铁人"、"学徒"、"写作者"）
└── Equipment / Cosmetics: 纯外观，收集向
```

**经验曲线**：用 `next_level_xp = 100 * level^1.5`，避免线性枯燥。

### 4.2 货币系统

| 货币 | 来源 | 用途 |
|---|---|---|
| **⭐ Gold（金币）** | 完成任务 / 习惯 | 小额兑换：休息、零食、一集剧 |
| **💎 Gems（宝石）** | 完成项目 / 达成 KR / 连击里程碑 | 大额兑换：周末短途、购物、游戏充值 |
| **🎫 Fate（命运券）** | 完成复盘 / 战胜挑战 / 稀有成就 | 唯一用途：**抽卡**（见 4.5） |

**关键**：这些货币**必须真的能兑换真实世界的奖励**——由用户自己预设"奖励商店"。否则就是空号。

### 4.3 Daily Commissions（日委托）

**直接照搬《原神》**：每日 4 个委托，完成有奖励。

设计细节：
- 系统从你所有的 Active Habits / Routines 里抽 3 个 + 从 Active Projects 的今日任务中抽 1 个
- 每个完成 +XP +Gold
- 4 个全完成**额外奖励**（"Katheryne 奖励"）：💎 Gems × 2 + 签到连击 +1
- 错过一天不扣 HP，但连击断（宽容设计，比 Habitica 柔软）

**心理机制**：4 个的固定数量让用户有"今天要做完"的清晰目标，比"10 个待办"友好得多。

### 4.4 Weekly Battle Pass

仿照 Genshin BP：
- 每周自动生成 8-10 个 Weekly Missions，覆盖多个 Area
- 每周累计 XP 上限（防止一天爆肝透支，鼓励节奏感）
- 每达到一个 BP 等级解锁奖励
- **季度 BP**：90 天周期，50 级，奖励逐级增强

例子（Weekly Missions）：
- "累计 5 小时深度工作" → 500 XP
- "跑步 ≥ 3 次" → 300 XP  
- "读完 1 本书" → 1000 XP + 成就
- "写 2 篇周记" → 200 XP
- "完成 1 次决策日志" → 400 XP

### 4.5 Gacha（抽卡 / 变奖励）

**这里是最危险也最吸引人的部分**。设计要点：

- 用 **Fate 券**抽卡，来源于高价值行为（复盘、挑战项目完成）
- 奖池内容是**精心设计的真实奖励**：
  - Common：小休息、一杯好咖啡
  - Rare：一次按摩、一本新书
  - Epic：周末短途、买个心仪好物
  - Legendary：重大自我奖励（换新设备、一次出国旅行预算）
- **保底机制**：每 30 抽必出 Rare 以上，每 80 抽必出 Epic 以上（类似 Genshin 的软保/硬保）
- 抽卡动画一定要爽（参考原神的发光特效 —— 这是最纯粹的 dopamine hit）

⚠️ **重要伦理**：这里是变奖励，设计不当会让人焦虑/上瘾。几条护栏：
- **Fate 券永远不能用钱买**（避免成为赌博）
- 每周 Fate 券获取有上限
- 提供"直接兑换"通道：不想抽可以用 Gems 直接买 Rare 奖励
- 用户可随时关掉 Gacha 模块

### 4.6 Events（限时活动）

对应 Genshin 的版本活动：

- 每月一个月度主题（"读书月"、"健身挑战月"）
- 季节性活动（春节目标、暑期冲刺）
- 随机"特殊委托"：系统检测到你情绪低 → 推送"散步 20 分钟 + 给朋友发消息" 的两步 quest，完成给 Epic 奖励

### 4.7 Achievements & Badges

成就库（静态 + 动态）：
- **连续型**：7 天连击、30 天、100 天、365 天
- **累积型**：完成 10/50/100/500 个任务
- **里程碑**：第一个 OKR 完成、第一篇 1000 字文章
- **隐藏成就**：周末不碰手机一整天、凌晨 5 点开始一天

**视觉呈现**：仿照 Steam 成就页，陈列感很重要。

### 4.8 Streaks（连击）

每一个 Daily / Routine 都有独立 streak：
- 3 天：🔥 点燃
- 7 天：🔥🔥 双焰
- 30 天：🌟 星标
- 100 天：👑 冠冕

Streak 断了**不扣 HP**，只是重新计数。提供"Freeze"道具：用 Gold 购买，可以免疫一次 streak 中断（类似 Duolingo）。

---

## 5. 决策辅助引擎

游戏化负责"微观让生活井井有条"，决策引擎负责"宏观辅助做出决策"。

### 5.1 Principles Library（原则库）

仿 Ray Dalio：每次遇到值得记录的情境，写一条 Principle。

数据结构：
```
Principle {
  id
  statement: "永远不为了讨好而接受不想做的事"
  domain: [Career, Relationships]
  created_at
  source_decision_ids: []  // 由哪些决策催生
  times_applied: int       // 后续被引用的次数
  last_applied: date
  confidence: 1-10
}
```

**亮点功能**：每次创建 Decision Log 时，系统推荐"相关的 Principles"给你参考。

### 5.2 Decision Journal（决策日志）

对每一个重要决定（工作选择、大笔消费、关系抉择……）：

**决策前记录**：
- 要决定的事
- 选项（至少 3 个，强制 Widen Options）
- 每个选项的 Expected Value（概率 × 收益 − 概率 × 损失）
- 引用的 Principles
- 预期结果
- Pre-mortem："如果这个决定 6 个月后失败了，最可能是什么原因？"
- 10-10-10 测试：10 分钟/10 个月/10 年后你会怎么想？

**6 个月后回看**：
- 实际结果
- 决策本身好不好（不以结果论）
- 有哪些信息当时没考虑
- 新增的 Principle

### 5.3 Weighted Decision Matrix

选择困难症工具：
- 列出选项（列）
- 列出维度（行）：e.g. 收入、成长、自由度、影响力、风险
- 每个维度设权重（0-10）
- 每个选项在每个维度打分（1-10）
- 自动计算加权总分

### 5.4 Expected Value Calculator

对于赌注型决策（投资、跳槽、创业）：
```
EV = P(success) × Reward − P(failure) × Cost
```
显示 EV + 置信区间。

### 5.5 Pain + Reflection Log

Dalio：Pain + Reflection = Progress。

当你标记一个"痛点"（失眠、吵架、项目搞砸……）：
- 描述发生了什么
- 情绪 / 想法
- 根因（5 Whys）
- 可以变成什么 Principle 或 Habit

---

## 6. 数据模型（核心表）

```
users
  id, email, name, class, created_at, timezone, preferences (jsonb)

vision
  user_id, statement, values[], updated_at

areas
  id, user_id, name, icon, color, weight, health_score

goals
  id, user_id, area_id, type (okr|milestone), objective,
  key_results (jsonb), timeframe, start, end, progress, confidence

projects
  id, user_id, area_id, goal_id, title, status, deliverable,
  start, deadline, completed_at

tasks
  id, user_id, project_id, title, status, priority, due,
  xp_reward, gold_reward, completed_at

habits
  id, user_id, area_id, title, direction (positive|negative|both),
  frequency, streak_current, streak_best, xp_per_tick

routines  (= Dailies)
  id, user_id, area_id, title, schedule (rrule),
  streak_current, streak_best, freezes_available

commissions_daily
  id, user_id, date, items (jsonb: task_id/habit_id refs),
  completed_count, bonus_claimed

battle_pass
  id, user_id, period_start, period_end, level, xp,
  claimed_levels[], missions (jsonb)

principles
  id, user_id, statement, domains[], confidence,
  times_applied, last_applied, created_at

decisions
  id, user_id, title, options (jsonb), chosen_option,
  principles_used[], ev_calculation, premortem,
  predicted_outcome, actual_outcome, reviewed_at

reviews
  id, user_id, kind (daily|weekly|monthly|quarterly),
  period_start, period_end, content (jsonb), mood, energy

xp_ledger
  id, user_id, amount, source_type, source_id, created_at

currencies
  user_id, gold, gems, fate

rewards_store
  id, user_id, name, cost_gold, cost_gems, category, redeemed_count

achievements
  id, user_id, key, unlocked_at, metadata (jsonb)

notes  (PARA-R, 简化版)
  id, user_id, title, content, kind, linked_areas[],
  linked_projects[], linked_goals[], tags[]
```

---

## 7. UI / UX 设计方向

### 7.1 三种主视图

**Dashboard（首页 / 游戏主界面）**
- 顶栏：角色头像 + Level + 今日 Commissions 进度
- 左侧：属性雷达图（6 个 Area Health）
- 中央：**今日**——4 个 Commissions + 3 个 Priority Tasks + 1 个 Focus Time
- 右侧：本周 BP 进度条 + Active Event 卡片
- 底部：连击热力图（GitHub-style）

**Strategy（战略视图）**
- 身份宣言 → 领域 → OKR → 项目 的 hierarchical tree（可折叠）
- Sankey 图：时间 / 精力如何从领域流向项目

**Review（复盘视图）**
- 四种复盘的入口（Daily / Weekly / Monthly / Quarterly）
- 历史复盘的时间轴
- AI 复盘助手：基于本周数据自动生成初稿

### 7.2 视觉语言建议

- **主色**：深蓝紫 / 黑曜石 + 高饱和点缀（原神风，有"史诗感"）
- **字体**：标题 Sans-Serif，正文 Serif 可选
- **动效**：任务完成时粒子飞向属性条（立即反馈）；抽卡动画必须隆重
- **夜间模式**：默认（深夜复盘时眼睛舒服）
- **移动端优先**：Web 但要 PWA，能装到手机桌面

### 7.3 参考美术

- Genshin 原神的角色 / 界面设计
- Habitica 的像素 RPG 风（备选）
- Rise of Kingdoms / Clash of Clans 的资源条设计
- 《哈迪斯》的成就解锁动画

---

## 8. 技术栈推荐

基于"快速上线 + 易迭代 + 独立开发者友好"三原则：

### 8.1 前端
- **Next.js 15 (App Router) + TypeScript**
- **Tailwind CSS v4 + shadcn/ui**（设计系统起步不痛苦）
- **Zustand** 做客户端状态（比 Redux 轻）
- **TanStack Query** 做服务端状态 + 缓存
- **Framer Motion** 做动效（尤其是抽卡 / 升级 / 完成任务的粒子）
- **Recharts / Visx** 做图表
- **PWA + Service Worker**

### 8.2 后端
- **Next.js API Routes** 起步够用，后续可拆 **Hono / FastAPI**
- **PostgreSQL + Prisma**（schema 清晰、migration 友好）
- **Redis**（Streak 计算、限流、排行榜）
- **Clerk 或 Supabase Auth**（省掉一堆认证工作）

### 8.3 AI 辅助
- **Claude / GPT API** 做以下事情：
  - 每周复盘自动生成初稿（输入：本周数据；输出：草稿给用户编辑）
  - Principles 归纳：从多条决策日志中抽取共性
  - 智能任务分解：输入"写论文"，AI 生成 Project + Tasks 初版
  - 教练对话：基于用户的身份宣言和近期数据，给出建议

### 8.4 部署
- **Vercel**（前端 + API）
- **Neon / Supabase**（Postgres）
- **Upstash**（Redis）
- 全部白嫖起步

### 8.5 可选增强
- **Tauri** 打包桌面端（你已经在 Ubuntu，可以直接用 Web）
- **自动同步**：读书数据来自微信读书 / 小宇宙；运动数据来自 Apple Health / Mi Fit
- **Webhook**：完成任务时推送到 Telegram / Discord，把社交奖励引入

---

## 9. MVP 路线图（分 5 个 Phase）

### Phase 0：产品立项（1 周）
- 写完身份宣言 + 选 5 个 Areas（手动，不用系统）
- 列 3 个 Q1 OKR
- 用 Notion/Excel 跑 2 周，验证"我真的会每天打开吗？"
- 如果 2 周后你确实每天打开 → 继续；否则先调整方法论

### Phase 1：MVP（4 周）
最小可玩版：
- [ ] 用户注册 + 身份/领域初始化
- [ ] Tasks / Habits / Routines CRUD
- [ ] XP + Level + Gold
- [ ] 每日 Daily Commissions（4 个）
- [ ] 基础 Dashboard（今日 + 属性条）
- [ ] Daily Review（简版，3 个问题）

**目标**：能替代你现有的待办工具，且你愿意每天打开。

### Phase 2：Strategy Layer（3 周）
- [ ] Goals / OKRs 模块
- [ ] Projects 模块
- [ ] 四层关联（Area ↔ Goal ↔ Project ↔ Task）
- [ ] Strategy 视图（树状）
- [ ] Weekly Review

### Phase 3：Gamification Deep（4 周）
- [ ] Weekly BP + 季度 BP
- [ ] Rewards Store（用户自定义兑换）
- [ ] Gacha 系统 + Fate 券
- [ ] Achievements & Badges
- [ ] Streaks + Freeze 道具

### Phase 4：Decision Support（3 周）
- [ ] Principles Library
- [ ] Decision Journal
- [ ] Weighted Decision Matrix
- [ ] Pain & Reflection Log
- [ ] Monthly / Quarterly Review

### Phase 5：Intelligence（持续）
- [ ] AI 复盘助手
- [ ] AI 目标拆解
- [ ] 数据看板（Area 健康度趋势、情绪 × 行为相关性）
- [ ] 外部数据同步（Health, 读书, 日历）
- [ ] 社交（可选）：家人 / 好友的小组队模式

---

## 10. 反模式与陷阱（血泪预警）

从所有 Notion / Habitica / Obsidian 模板看过来的"失败教训"：

### 10.1 系统本身成为目的
**症状**：花 30 分钟维护系统，只花 2 小时做事。
**对策**：每周统计 "系统维护时间 / 有效产出时间"，超过 10% 立即砍功能。

### 10.2 外在动机挤出内在动机（Overjustification Effect）
**症状**：没 XP 不想做事，失去为"做事本身"而做事的乐趣。
**对策**：
- 不让 XP 成为**唯一**反馈
- 每季度尝试"无游戏化周"
- 游戏化只是糖衣，药才是正事

### 10.3 完美主义导致弃坑
**症状**：某天没打卡 → 连击断了 → 心态崩了 → 再也不碰。
**对策**：
- Never Miss Twice（Clear 的原则）：错过一天没关系，不要错过两天
- Freeze 道具 + 软保底（一周错过 ≤ 1 天不算断）
- 从来不强制 100%

### 10.4 惩罚机制过重
**症状**：Habitica 掉级机制劝退 70% 新手。
**对策**：LifeOS 默认**无 HP 惩罚**，只有属性衰减（2 周不动的 Area 属性每周 -1），可设置强制惩罚模式给"M 属性"用户。

### 10.5 Dashboard 视觉过载
**症状**：打开首页 17 个数据块，认知过载，直接关掉。
**对策**：首页只显示**今日 + 本周**，其它全部在二级页面。

### 10.6 数据孤岛
**症状**：日记在 Notion，待办在 Todoist，习惯在 Habitica，健身在 Keep，一个月后你什么都复盘不出来。
**对策**：LifeOS 本身就是要解决这个。但也要承认：不是所有东西都必须进系统。读书笔记可以留在微信读书，然后自动同步摘要到 LifeOS 即可。

### 10.7 社交功能带来的攀比焦虑
**症状**：看到别人连击 200 天，自己 3 天就开始焦虑。
**对策**：Habitica 的做法——**默认不做公开排行榜**；只做"你 vs 过去的你"。

### 10.8 过度理性
**症状**：想把人生每个角落都量化，但人的很多价值来自"不可量化"的瞬间。
**对策**：
- Wellbeing 这个 Area 的大部分指标不用数字，用每周一句话日记
- 保留 "off-grid time"：每周留 4 小时完全不记录的时间

---

## 11. 延伸阅读 & 资源

### 11.1 书籍（优先级排序）

1. **《Atomic Habits》** James Clear — 不读不动手，全书是 LifeOS 习惯层的 bible
2. **《Principles: Life and Work》** Ray Dalio — 决策层核心
3. **《Building a Second Brain》** Tiago Forte — PARA 原典
4. **《Getting Things Done》** David Allen — GTD 原典
5. **《Hooked》** Nir Eyal — 游戏化与变奖励
6. **《The Power of Habit》** Charles Duhigg — 习惯回路科学基础
7. **《Feel-Good Productivity》** Ali Abdaal — 为什么要游戏化
8. **《Decisive》** Chip & Dan Heath — WRAP 决策框架
9. **《Indistractable》** Nir Eyal — 注意力保护
10. **《The 12 Week Year》** Brian Moran — Sprint 节奏

### 11.2 产品参考

- **Habitica** — RPG 化习惯追踪（开源，代码可参考）
- **Finch** — 更温柔的宠物陪伴型习惯 app
- **Streaks / Way of Life** — 极简 habit tracker
- **Notion Life OS 模板**（Easlo、Thomas Frank、人生无限公司 Life·X、喵星探险记）— 看他们怎么组织
- **Roam Research / Logseq / Obsidian** — 双链笔记的信息组织思路
- **Sunsama** — 每日规划 + 复盘的商业产品（付费，但很有借鉴意义）
- **Genshin Impact** — 打开来把 UI / 奖励流程截一遍屏

### 11.3 文章与视频

- August Bradley 的 YouTube 频道：PPV 系统的深度讲解
- Ali Abdaal 的 Weekly Review 文章与视频
- Tiago Forte 的 fortelabs.com
- Trophy.so 的 gamification case studies（Habitica、Duolingo、Strava 分析）
- 少数派 sspai.com 的《P.B.A.T.》《用 Notion 搭建人生操作系统》等中文实战

---

## 12. 结语：给你（作为建造者）的三条建议

1. **先用再造**：在写一行代码前，用 Notion 或 Excel 跑 4-6 周。如果你自己都不会每天打开，做出 Web 版也没人会用。
2. **从"骨架 + 1 个闪亮功能"开始**：MVP 的骨架（任务 + 习惯 + XP + Daily Commission）任何人都能做出来；你真正的差异化来自一个"让人记住"的功能。选一个：可能是 AI 教练、可能是抽卡、可能是决策日志。
3. **把自己当成 User Zero**：你的使用数据是最真实的 feedback loop。每次迭代问："我这周真的用了这个功能吗？用了几次？带来了什么？"

这不是一个"两周做完的项目"；这是一个**你下半生都在迭代的个人操作系统**。
做得好，它会成为你人生放大器。做得糟，它会成为又一个"Day 47: I gave up on my productivity app" 的笑话。

祝你做出前者。

---

_Document version 1.0 · 作者：依据公开资料整合 · 可自由修改并作为你自己的 Spec_
