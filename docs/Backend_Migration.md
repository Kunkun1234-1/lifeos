# LifeOS 前后端分离

## 最终结构

前后端业务运行时已经拆开：

```text
Web（仓库根目录，默认 :3000）
  ├── React / Next.js 页面
  ├── TanStack Query
  ├── Auth.js 登录
  └── 短期 API Token 签发

API（apps/api，默认 :4000）
  ├── 全部业务 Route Handler
  ├── JWT 校验与 CORS
  ├── Prisma / PostgreSQL
  ├── DeepSeek、上传、奖励及财务逻辑
  └── /health 与 /ready

共享包
  ├── packages/contracts：Zod API 契约
  └── packages/domain：任务、奖励、成就领域服务
```

Web 中只保留：

- `/api/auth/[...nextauth]`
- `/api/auth/backend-token`

所有业务 `/api/*` 均由 `apps/api` 提供。Web 生产构建的路由表中不再包含业务 API。

## 本地运行

`.env.local` 至少需要数据库和 Auth.js 配置。建议显式增加：

```env
API_JWT_SECRET="使用 openssl rand -base64 48 生成"
NEXT_PUBLIC_API_URL="http://127.0.0.1:4000"
WEB_ORIGIN="http://127.0.0.1:3000,http://localhost:3000"
```

分别启动：

```bash
npm run dev
npm run dev:api
```

- Web：`http://127.0.0.1:3000`
- API：`http://127.0.0.1:4000`
- API 存活检查：`http://127.0.0.1:4000/health`
- 数据库就绪检查：`http://127.0.0.1:4000/ready`

## 认证边界

Auth.js Session Cookie 只交给 Web。登录后的浏览器向 Web 请求：

```text
POST /api/auth/backend-token
```

Web 签发 5 分钟 JWT，浏览器只在内存中缓存，并通过
`Authorization: Bearer ...` 调用 API。API 同时在 Middleware 和用户解析层验证：

- `issuer = lifeos-web`
- `audience = lifeos-api`
- `subject = userId`
- `API_JWT_SECRET` 或 `AUTH_SECRET`

## 部署

建议在同一 Git 仓库创建两个 Vercel Project：

### Web Project

- Root Directory：仓库根目录
- Build Command：`npm run build`
- 必需变量：`DATABASE_URL`、`AUTH_SECRET`、Google OAuth 变量、
  `API_JWT_SECRET`、`NEXT_PUBLIC_API_URL`

Web 仍需要数据库连接，仅用于 Auth.js Adapter 和首次登录用户创建；业务数据请求不会从 Web 访问数据库。

### API Project

- Root Directory：`apps/api`
- Build Command：`npm run build`
- Framework：Next.js
- 必需变量：`DATABASE_URL`、`API_JWT_SECRET`、`WEB_ORIGIN`
- 可选变量：Vercel Blob、DeepSeek 配置

Vercel 应按 npm workspace 安装仓库根依赖；API 的构建脚本会从根目录读取 Prisma Schema 和共享 packages。

## 验证

```bash
npm run verify:split
npm run smoke:notes
```

`verify:split` 会验证两套 TypeScript、两套生产构建、23 个业务模块读取、Task CRUD，以及并发完成幂等性。`smoke:notes` 会同时启动 Web 和 API，验证 Dev Login、JWT 桥接、Notes 和 Routine 跨服务写入。
