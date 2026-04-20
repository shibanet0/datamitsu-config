#!/usr/bin/env node

import { spawn } from "node:child_process";

import { getBinaryFilepath } from "./utils.js";

const args = process.argv.slice(2);

const child = spawn(getBinaryFilepath("typescript/package.json", "../bin/tsc"), args, {
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else if (code !== 0) {
    process.exit(code);
  }
});
