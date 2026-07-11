import { spawn } from "node:child_process";
import fs from "node:fs";

loadEnvFile(".env.local");
loadEnvFile(".env");

const command = process.argv[2];
if (!command) {
  console.error("Usage: node scripts/run-api.mjs <dev|build|start|typecheck>");
  process.exit(1);
}

const child = spawn(
  "npm",
  ["run", command, "--workspace", "@lifeos/api", ...process.argv.slice(3)],
  {
    stdio: "inherit",
    env: process.env,
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}
