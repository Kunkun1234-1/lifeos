// src/env.ts
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { z } from "zod";
var rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });
var EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  API_JWT_SECRET: z.string().min(32),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4e3),
  WEB_ORIGIN: z.string().default("http://localhost:3000")
});
var env = EnvSchema.parse(process.env);

export {
  env
};
//# sourceMappingURL=chunk-TTYSRA5W.js.map