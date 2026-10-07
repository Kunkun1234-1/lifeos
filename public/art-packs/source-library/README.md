# 原始素材与裁切来源

原来的根目录 `素材/` 和 `life_manager_asset_sheet_crops/` 已并入艺术包，避免同时维护多个素材目录。

- `originals/`：原始背景、头像、角色图和参考截图中与已有艺术包不同的文件，保留原文件名。
- `asset-sheet-crops/`：素材图集的独特裁切图和原始图集。`manifest.json` 指向去重后的真实文件，`original-manifest.json` 保留原裁切说明。
- 已经与 `../legacy-lifeos/` 内素材逐字节相同的文件不另存副本，历史文件名与当前位置见 `../library-manifest.json`。

这里记录原始来源与旧视觉参考，不代表当前默认画风。新的道具、皮肤与背景遵循 `../anime-rpg-v1/STYLE.md`，按艺术包的用途子目录存放。
