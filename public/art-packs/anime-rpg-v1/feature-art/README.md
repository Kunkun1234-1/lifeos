# 全部功能入口插画

全部功能页沿用 `../STYLE.md` 的二次元手绘道具风格，以小物件清晰表达功能，不再使用写实山谷、柔光风景或全幅环境插画。

| 功能 | 素材 | 来源 |
| --- | --- | --- |
| 待办事项 | `tasks.webp` | 新绘：翠绿任务册与铅笔 |
| 习惯追踪 | `habits.webp` | 新绘：陶盆与成长幼苗 |
| 今日安排 | `routines.webp` | 新绘：蓝色日历册 |
| 每日复盘 | `../items/book.webp` | 复用认可的绿色手记 |
| 目标清单 | `goals.webp` | 新绘：木质目标靶与箭 |
| 项目工坊 | `../items/aurora-workshop.webp` | 复用认可的工具包 |
| 人生全景 | `../items/horizon-map.webp` | 复用认可的地图 |
| 知识库 | `../items/azure-book.webp` | 复用认可的蓝色书籍 |
| 数据中心 | `analytics.webp` | 新绘：纸质图表册 |
| 奖励商店 | `../items/artisan-gift.webp` | 复用认可的礼匣 |
| 祈愿召唤 | `../items/fate.webp` | 复用认可的命运星球 |
| 背包终端 | `inventory.webp` | 新绘：绿色帆布背包 |

新绘素材由内置 imagegen 根据认可的原图生成，透明背景、512 × 512 WebP。高分辨率 PNG 原图和完整提示词位于 `../sources/feature-art/`。复用图片直接引用，避免再存一份相同素材。`../manifest.json` 的 `featureArt` 记录全部 12 个入口的文件、尺寸和来源；代码对应 `src/lib/art-assets.ts` 的 `FEATURE_ART`。

卡片使用按功能色调配置的克制浅底，物件完整放在文字右侧；图片中不包含名称、菜单、卡片边框或说明文字。
