import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const schemaPath = fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url));
const prismaCli = fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url));

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repositoryRoot, env: process.env, stdio: "inherit" });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required for production database migrations");
    process.exit(1);
  }
  run(process.execPath, [prismaCli, "migrate", "deploy", "--schema", schemaPath]);
}

run("npm", ["run", "build", "--workspace", "@lifeos/api"]);
