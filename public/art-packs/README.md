# 艺术包

项目美术资源的统一目录。新道具、皮肤、背景、角色插画与动画都放在这里，以艺术包为单位管理；业务代码通过公开路径 `/art-packs/…` 使用。

## 当前艺术包

| 目录 | 内容 | 状态 |
| --- | --- | --- |
| `anime-rpg-v1/` | 已认可的二次元手绘道具风格、20 个透明道具图、全部功能入口插画及源图 | 当前道具与功能插画包；风格以 `STYLE.md` 和认可的源图为准 |
| `legacy-lifeos/` | 项目已有的背景、角色、界面插画、旧道具和祈愿动画 | 原有美术归档；沿用原画风，没有重新生成 |
| `source-library/` | 之前散落在根目录的原图、参考截图和素材裁切图 | 独特内容保留；与艺术包完全相同的文件按 SHA-256 去重 |

`anime-rpg-v1/items/` 是背包、奖励商店和祈愿共用的当前道具素材。旧包保留原目录层级 `lifeos/`、`life-game/`、`gacha/`，路径清单见 `legacy-lifeos/manifest.json`。

全部功能页从 `anime-rpg-v1/feature-art/` 与已认可的 `items/` 取用插画，共 12 个入口，见该包的 `feature-art/README.md`。

根目录原来的 `素材/` 和 `life_manager_asset_sheet_crops/` 已并入这里。`library-manifest.json` 记录每个历史文件的当前位置与内容哈希，查旧文件名时查这份清单。美术资源只在本目录存放一份。

## 添加资源

- 每个包有 `STYLE.md` 或说明文件，写明适用范围、参考图与风格约束。
- 道具存 `items/`；皮肤存 `skins/`；背景存 `backgrounds/`；认可的源图和生成提示词存 `sources/`。
- 当前包使用 256 × 256、透明背景、无字、无卡片边框的 WebP 道具图。不要把界面稀有度、数量和名称烧进图片。
- 认可的图案优先直接复用，生成变体需要再次审阅；新图不得覆盖认可的源图。
- 现有头像装备主要是 CSS/JSON 生成的装饰环，并无独立皮肤位图；以后新增位图皮肤放进 `skins/`，不要另建散落的资源目录。

## 兼容与取用

`src/lib/art-assets.ts` 是当前道具地址与历史地址的映射。它兼容数据库里已有的奖励图片地址，不需要修改历史兑换数据。

旧公开图片与动画的 URL 通过 `legacy-urls.json` 和 Next.js rewrites 兼容，不再保留旧目录中的美术副本。新的静态美术引用直接使用本目录。`public/gacha/audio/` 的音乐、用户上传文件和字体不属于美术包，继续使用原路径。

检查目录统一与兼容映射：

```sh
npx tsx scripts/test-art-library.ts --unified
npx tsx scripts/test-art-assets.ts
```
