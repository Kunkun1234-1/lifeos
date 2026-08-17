# 参与贡献

感谢你愿意帮助改进 LifeOS。提交改动前，请先搜索现有 Issue 和 Pull Request，避免重复工作。

## 本地开发

要求 Node.js 20+、npm 和一个可访问的 PostgreSQL 数据库。

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run db:deploy
npm run dev
```

API 服务可在另一个终端中启动：

```bash
npm run dev:api
```

请只在本地环境文件中填写数据库密码、OAuth 密钥和 API Key。不要提交 `.env*`、Google OAuth 下载文件、令牌、数据库备份或生产日志。

## 提交流程

1. 从 `main` 创建主题分支。
2. 保持改动聚焦，并为行为变更补充相应验证。
3. 至少运行 `npm run lint`、`npm run typecheck` 和 `npm run typecheck:api`。
4. 涉及构建、API 或 MCP 时，再运行 README 中对应的 build 和 smoke tests。
5. 创建 Pull Request，说明改动目的、用户影响和验证结果。

## 报告问题

普通缺陷和功能建议可以提交公开 Issue。安全漏洞请不要公开披露，改用 [安全策略](SECURITY.md) 中的私密报告渠道。
