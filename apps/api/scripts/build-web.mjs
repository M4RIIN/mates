import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const mobile = path.join(root, "apps/mobile");
const cli = createRequire(path.join(mobile, "package.json")).resolve("expo/bin/cli");
const result = spawnSync(process.execPath, [cli, "export", "--platform", "web", "--output-dir", "../api/public/app", "--max-workers", "2"], {
  cwd: mobile,
  stdio: "inherit",
  env: { ...process.env, MATES_WEB_BASE_PATH: "/app", EXPO_PUBLIC_API_HOSTED_WEB: "true" }
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
