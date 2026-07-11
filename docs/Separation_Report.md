# LifeOS 前后端分离完成报告

## 结论

LifeOS 已从单个 Next.js 全栈运行时拆分为独立 Web 与独立 API 应用。业务 API、Prisma 数据访问、AI、上传和业务事务全部运行在 `apps/api`；Web 只保留页面、客户端状态和 Auth.js 登录桥接。

## 代码边界

| 边界 | 位置 | 责任 |
|---|---|---|
| Web | 仓库根目录 `src/app` | 页面、交互、React Query、Auth.js |
| API | `apps/api/src/app/api` | 全部业务 API |
| Contract | `packages/contracts` | Zod 请求/响应契约 |
| Domain | `packages/domain` | 可复用业务服务与事务 |
| Database | `prisma` | Schema、Migration、Seed |

Web 构建只包含两个认证端点；API 构建包含全部业务端点及独立健康检查。

## 数据与安全

- API 使用五分钟 Bearer JWT，不把 Token 写入 localStorage。
- API Middleware 实施 JWT 验证和 CORS allowlist。
- 每个业务 Handler 继续执行用户级数据过滤。
- Task 的 Area/Project 外键增加归属校验。
- Task 完成、XP Ledger、Area XP 和 Currency 更新位于同一个 Prisma 事务。
- 并发完成同一任务时只允许一个请求成功，另一个返回 `409`。

## 兼容性变化

- `NEXT_PUBLIC_API_URL` 在生产环境成为必填变量。
- 本地开发默认 API 地址为 `http://127.0.0.1:4000`。
- 本地磁盘上传返回 API 绝对 URL，不再假设文件由 Web 域名提供。
- Web 与 API 必须使用相同的 `API_JWT_SECRET`。

## 自动化验证

- ESLint
- Web TypeScript
- API TypeScript
- Web production build
- API production build
- API 未认证请求验证
- 23 个业务模块读取冒烟
- Task 创建、更新、删除
- Task 并发完成 `200/409`
- Web Dev Login
- Web 到 API JWT 桥接
- Notes 与 Routine 跨服务 CRUD

## 后续工程债务

分离已经完成，但原代码中仍有后续可继续治理的内容：

- Habit、Routine、Goal、Project 等奖励操作尚未全部升级为共享原子事务。
- 部分状态和结构化数据仍使用 String/JSON 字符串。
- OAuth Client Secret 历史泄漏仍需要在 Google Cloud 轮换并清理 Git 历史。
- 当前依赖审计仍报告若干第三方包 advisory，应单独评估升级。
