import { spawnSync } from "node:child_process";

const isBun = Boolean(process.versions.bun);
const command = process.execPath;
const args = isBun
  ? ["test", "tests/module-repository.test.ts"]
  : ["--import", "tsx", "--test", "tests/module-repository.test.ts"];

const result = spawnSync(command, args, { stdio: "inherit" });
process.exit(result.status ?? 1);
