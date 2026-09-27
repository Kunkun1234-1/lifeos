# LifeOS 公开仓库前检查清单

当前结论：仓库暂时不适合直接切换为公开。宣传素材统一使用“准备开源”，避免提前宣称“已开源”。

## P0：必须先处理

- [ ] 立即在 Google Cloud 轮换 / 撤销当前 OAuth 客户端密钥。
- [ ] 从当前提交中删除已跟踪的 `client_secret_*.apps.googleusercontent.com.json`。
- [ ] 清理 Git 历史中的该文件。只删除最新版本不够；旧提交仍然可以下载。可在完成备份和协作通知后使用 `git filter-repo` 或创建一个干净的新公开仓库。
- [ ] 确认所有 `.env`、数据库备份、Vercel 导出文件、日志和截图均未包含生产密钥或个人数据。
- [ ] 新增明确的开源 License；当前仓库没有 `LICENSE` / `COPYING` / `NOTICE`。

## P0：第三方素材版权

- [ ] 审计 `life_manager_asset_sheet_crops/`、`public/lifeos/`、`public/gacha/` 中的图片、音频与视频来源。
- [ ] 对没有明确商用与再分发授权的角色立绘、头像、游戏 UI、音乐、音效和视频进行替换或删除。
- [ ] 为保留的第三方素材记录作者、原始链接、License 与署名要求。
- [ ] 重新导出最终宣传截图，确保不再展示未获授权的角色或品牌化素材。

## P1：开源协作体验

- [ ] README 首屏补充项目定位、核心截图、快速启动和在线 Demo。
- [ ] 增加 `CONTRIBUTING.md`、`SECURITY.md`、`CODE_OF_CONDUCT.md`。
- [ ] 增加 Issue / Pull Request 模板和功能路线图。
- [ ] 提供一条可复现的本地开发路径，包括 PostgreSQL、迁移、种子数据和 Dev 登录说明。
- [ ] 验证全新机器从 clone 到运行不依赖作者本地文件。

## P1：发布前验证

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run typecheck:api`
- [ ] `npm run build`
- [ ] `npm run build:api`
- [ ] `npm run smoke:api`
- [ ] `npm run smoke:notes`
- [ ] `npm run smoke:wallet`
- [ ] `npm run smoke:mcp`

## 宣传文案状态切换

完成以上 P0 项并公开仓库后：

- 把宣传图中的“准备开源”改成“现已开源”；
- 将 `【开源地址】` 与 `【在线体验】` 替换为真实地址；
- 在置顶评论中说明素材 License 与当前路线图。
