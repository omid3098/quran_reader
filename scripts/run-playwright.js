#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const shouldProbe = process.env.PLAYWRIGHT_SKIP_PROBE !== "1";

if (shouldProbe) {
  const probe = spawnSync(
    process.execPath,
    [
      "-e",
      "require('http').createServer().listen(0,'127.0.0.1',()=>process.exit(0)).on('error',()=>process.exit(1));",
    ],
    { stdio: "ignore" }
  );

  if (probe.status !== 0) {
    console.warn(
      "[playwright] Skipping e2e run because the environment cannot bind to a local port (likely sandboxed)."
    );
    process.exit(0);
  }
}

const result = spawnSync("playwright", ["test"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
