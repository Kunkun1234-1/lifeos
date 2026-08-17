# LifeOS

[在线体验](https://lifeos-topaz-chi.vercel.app) · [贡献指南](CONTRIBUTING.md) · [安全策略](SECURITY.md) · [MIT License](LICENSE)

LifeOS 是一个把 PARA、GTD、OKR、复盘、个人资产与游戏化成长结合起来的个人操作系统。仓库包含两个独立部署的 Next.js 应用，以及一个供 ChatGPT/Agent 使用的 OAuth MCP 服务。

本项目采用 [MIT License](LICENSE) 开源，欢迎提交 Issue 和 Pull Request。`package.json` 中保留 `"private": true` 仅用于防止误发布到 npm，不代表 GitHub 仓库是私有软件。

## 正式环境（唯一准确信息源）

| 服务 | Vercel 项目 | Root Directory | 正式地址 |
| --- | --- | --- | --- |
| Web / OAuth | `lifeos` | 仓库根目录 `.` | <https://lifeos-topaz-chi.vercel.app> |
| Business API / MCP | `lifeos-api` | `apps/api` | <https://lifeos-api-nine.vercel.app> |

固定端点：

- 网站：<https://lifeos-topaz-chi.vercel.app>
- 登录：<https://lifeos-topaz-chi.vercel.app/login>
- API 健康检查：<https://lifeos-api-nine.vercel.app/health>
- MCP：<https://lifeos-api-nine.vercel.app/mcp>
- MCP Protected Resource Metadata：<https://lifeos-api-nine.vercel.app/.well-known/oauth-protected-resource>
- OAuth Authorization Server Metadata：<https://lifeos-topaz-chi.vercel.app/.well-known/oauth-authorization-server>
- Google OAuth 回调（Google Cloud 必须逐字一致）：`https://lifeos-topaz-chi.vercel.app/api/auth/callback/google`

不要再使用旧的猜测地址 `lifeos-kunkun1234-1s-projects.vercel.app`。Google 的 `redirect_uri_mismatch` 表示 Google Cloud 中登记的 Authorized redirect URI 与上面的正式回调不完全一致（协议、域名、路径、尾部斜杠都必须一致）。

## 架构

```text
ChatGPT / MCP client
        │  OAuth 2.1 + PKCE
        ▼
Web（根目录，端口 3000） ── 登录、授权、令牌签发
        │
        ▼
API（apps/api，端口 4000） ── /mcp + 全部业务 Route Handlers
        │
        ▼
PostgreSQL / Prisma
```

- Web：页面、Auth.js Google 登录、MCP OAuth 授权服务器。
- API：全部业务 API、93 个 MCP 工具、鉴权、审计和幂等执行。
- `packages/contracts`：任务、目标等共享请求契约。
- `packages/domain`：可复用领域逻辑。
- `prisma`：PostgreSQL schema、迁移和种子数据。
- 进一步资料：[后端迁移说明](docs/Backend_Migration.md)、[数据库设计](docs/Database_Design.md)。

## 完整 MCP

MCP 是 tool-only 服务，不需要额外 Widget。Agent 登录 LifeOS 后只能访问当前用户自己的数据。工具层使用明确的白名单调用现有业务 API，不提供任意 URL、任意 SQL 或任意数据库工具。

当前共 93 个工具，覆盖网页已有功能：

- 查询：Dashboard、Analytics、Areas、Tasks、Habits、Routines、Goals/KR、Projects、Notes/Tree、Principles、Decisions、Reviews、Reward Store、Inventory、Achievements、Events、Battle Pass、Gacha、Wallet/Transactions、Equipment、Titles、Commissions、Profile、Resin、Freeze。
- 计划与执行：创建、修改、完成、归档或删除任务、习惯、例行事项、目标、关键结果和项目。
- 知识与复盘：创建、修改、移动或删除笔记；维护原则、决策记录与周期复盘。
- 资产与奖励：钱包初始化和设置，收入/支出/转账、修改、退款、删除、月结；奖励商品、兑换和库存处理。
- 游戏化：成就、活动、通行证、每日委托、称号、装备、冻结道具和祈愿。
- AI：决策教练、日程教练、周/月/季度教练；服务端会执行限流和树脂扣除/失败退款。
- 媒体：上传图片或音频到 Vercel Blob（未配置 Blob 时仅本地磁盘回退）。

核心实现位于：

- MCP endpoint：[apps/api/src/app/mcp/route.ts](apps/api/src/app/mcp/route.ts)
- 工具目录：[apps/api/src/mcp/tools.ts](apps/api/src/mcp/tools.ts)
- 内部 API 白名单桥：[apps/api/src/mcp/api-client.ts](apps/api/src/mcp/api-client.ts)
- OAuth token 验证：[apps/api/src/mcp/auth.ts](apps/api/src/mcp/auth.ts)
- 审计与幂等：[apps/api/src/mcp/audit.ts](apps/api/src/mcp/audit.ts)
- OAuth server：[src/lib/mcp-auth.ts](src/lib/mcp-auth.ts)

### MCP 权限

| Scope | 能力 |
| --- | --- |
| `lifeos:read` | 查看当前用户的全部 LifeOS 状态 |
| `lifeos:write` | 创建、修改、归档和删除普通内容 |
| `lifeos:economy` | 钱包、兑换、祈愿、领取等经济副作用操作 |
| `lifeos:ai` | 调用外部 AI 教练并消耗树脂 |
| `tasks:write` / `goals:write` | 兼容早期已授权客户端的旧 scope |

所有非只读工具都要求 `idempotencyKey`，执行记录写入 `AgentAction`。同一个 key 重试同一操作会返回上次结果；同 key 换参数会被拒绝。删除、消费、祈愿、月结、AI 消耗等工具还带有 destructive/open-world 标注，供客户端显示确认。

### 在 ChatGPT 中连接

1. 确认下面的生产环境变量均已配置并重新部署两个项目。
2. 在 ChatGPT 开启 Developer mode，创建远程 MCP app/connector。
3. MCP Server URL 填写 `https://lifeos-api-nine.vercel.app/mcp`。
4. ChatGPT 会自动读取 Protected Resource Metadata，跳转到 LifeOS Web 登录并显示权限同意页。
5. 如果之前连接过 7 工具旧版 MCP，断开后重新连接一次，以授予新增 scope 并刷新到 93 个工具。

Vercel 的 API Production Deployment Protection 必须允许 ChatGPT 公网访问，否则远程 MCP 无法读取 metadata 或连接 `/mcp`。

## 环境变量

先复制本地模板：

```bash
cp .env.example .env.local
```

机密值不要提交 Git。`API_JWT_SECRET`、`MCP_OAUTH_SECRET` 和 `AUTH_SECRET` 都应是至少 32 字符的随机值。两个 Vercel 项目中，共享 secret 必须保持相同。

### Web 项目 `lifeos`

| 变量 | 正式值/说明 |
| --- | --- |
| `DATABASE_URL` | 生产 PostgreSQL 连接串 |
| `AUTH_SECRET` | 32+ 字符随机 secret |
| `AUTH_URL` | `https://lifeos-topaz-chi.vercel.app` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `API_JWT_SECRET` | 与 API 项目相同 |
| `NEXT_PUBLIC_API_URL` | `https://lifeos-api-nine.vercel.app` |
| `MCP_OAUTH_SECRET` | 与 API 项目相同 |
| `MCP_AUTH_ISSUER` | `https://lifeos-topaz-chi.vercel.app` |
| `MCP_RESOURCE_URL` | `https://lifeos-api-nine.vercel.app/mcp` |

### API 项目 `lifeos-api`

| 变量 | 正式值/说明 |
| --- | --- |
| `DATABASE_URL` | 与 Web 指向同一生产数据库 |
| `API_JWT_SECRET` | 与 Web 项目相同 |
| `AUTH_SECRET` | 可选 fallback；建议与 Web 对齐 |
| `WEB_ORIGIN` | `https://lifeos-topaz-chi.vercel.app` |
| `MCP_OAUTH_SECRET` | 与 Web 项目相同 |
| `MCP_AUTH_ISSUER` | `https://lifeos-topaz-chi.vercel.app` |
| `MCP_RESOURCE_URL` | `https://lifeos-api-nine.vercel.app/mcp` |
| `DEEPSEEK_API_KEY` | AI 教练必需；仅服务端 |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 默认 `deepseek-chat` |
| `BLOB_READ_WRITE_TOKEN` | 生产媒体上传必需，由 Vercel Blob 注入 |

部署后用下面命令检查配置是否生效：

```bash
curl https://lifeos-api-nine.vercel.app/health
curl https://lifeos-api-nine.vercel.app/.well-known/oauth-protected-resource
curl https://lifeos-topaz-chi.vercel.app/.well-known/oauth-authorization-server
```

Protected Resource Metadata 中的 `resource` 必须是 `https://lifeos-api-nine.vercel.app/mcp`，不能是 `127.0.0.1`。
代码在未设置显式 MCP 变量时会依次回退到 `NEXT_PUBLIC_API_URL` 和 Vercel 的
`VERCEL_PROJECT_PRODUCTION_URL`，但生产环境仍建议显式填写上表的稳定地址，便于以后更换域名。

## 本地开发

要求 Node.js 20+、npm 和可访问的 PostgreSQL。

```bash
npm install
npm run db:generate
npm run db:deploy
```

分别启动两个进程：

```bash
npm run dev
npm run dev:api
```

- Web：<http://localhost:3000>
- API：<http://127.0.0.1:4000>
- MCP：<http://127.0.0.1:4000/mcp>

本地 MCP 环境值：

```dotenv
AUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000
WEB_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
MCP_AUTH_ISSUER=http://localhost:3000
MCP_RESOURCE_URL=http://127.0.0.1:4000/mcp
```

## 验证与测试

```bash
npm run lint
npm run typecheck
npm run typecheck:api
npm run build
npm run build:api
npm run smoke:api
npm run smoke:notes
npm run smoke:wallet
npm run smoke:mcp
```

`smoke:mcp` 会启动临时 Web/API 服务，实际验证 OAuth Dynamic Client Registration、Authorization Code + PKCE、refresh token rotation、93 个工具发现、鉴权读写和幂等重放。

## 参与贡献

提交代码前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。发现安全问题时不要创建公开 Issue，请按照 [SECURITY.md](SECURITY.md) 中的方式私下报告。

## 数据库变更

修改 [prisma/schema.prisma](prisma/schema.prisma) 后：

```bash
npm run db:migrate
npm run db:generate
```

生产部署前或部署阶段应用已提交的迁移：

```bash
npm run db:deploy
```

MCP 依赖 `OAuthClient`、`OAuthAuthorizationCode`、`OAuthRefreshToken` 和 `AgentAction` 数据表；首次部署 MCP 前必须先应用迁移。

## Vercel 自动部署

两个 Vercel 项目都连接此 Git 仓库的 `main` 分支。向 `main` push 后会分别构建 Web 与 API，无需手动上传文件。

发布顺序：

1. 本地运行类型检查、构建和 smoke tests。
2. 有 Prisma 迁移时执行 `npm run db:deploy`。
3. commit 并 push `main`。
4. 等待 `lifeos` 与 `lifeos-api` 两个 Vercel Production Deployment 成功。
5. 检查 `/health`、两个 OAuth metadata 和 `/login`。
6. 重新连接 ChatGPT MCP，确认能发现 93 个工具。

## 常见故障

- Google `Error 400: redirect_uri_mismatch`：Google Cloud Authorized redirect URI 没有逐字配置为 `https://lifeos-topaz-chi.vercel.app/api/auth/callback/google`。
- Metadata 仍显示 `http://127.0.0.1:4000/mcp`：API 项目缺少 `MCP_RESOURCE_URL` 或环境变量修改后未重新部署。
- MCP 401：访问令牌过期、issuer/resource 不一致，或两个项目的 `MCP_OAUTH_SECRET` 不同。
- MCP 能读不能写：旧连接没有 `lifeos:write` / `lifeos:economy` / `lifeos:ai`，断开并重新授权。
- MCP 内部 API 401/503：两个项目的 `API_JWT_SECRET` 不同，或 secret 少于 32 字符。
- AI 工具 503：API 项目未配置 `DEEPSEEK_API_KEY`。
- 上传在 Vercel 失败：未连接 Vercel Blob 或缺少 `BLOB_READ_WRITE_TOKEN`。
- ChatGPT 无法发现 MCP：API Deployment Protection 阻止公网访问，或 MCP URL 不是精确的 HTTPS `/mcp` 地址。
