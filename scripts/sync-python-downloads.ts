#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { selectPythonDownloads } from "./lib/python-downloads.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(root, "src/datamitsu-config/registries/runtimes.json");
const compatPath = path.join(root, "src/datamitsu-config/registries/uv-python314.json");

async function syncPythonDownloads(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] && !/^3\.\d+\.\d+$/.test(args[0]))) {
    throw new Error("Usage: node scripts/sync-python-downloads.ts [python-version]");
  }
  const runtimes = JSON.parse(await fs.readFile(registryPath, "utf8"));
  const tag =
    runtimes.uv.managed.binaries.linux.amd64.glibc.url.match(/\/download\/([^/]+)\//)?.[1];
  if (!tag) throw new Error("Unable to derive the uv tag from its pinned runtime archive URL");
  const old = JSON.parse(await fs.readFile(compatPath, "utf8"));
  const pythonVersion = args[0] ?? old.pythonVersion;
  if (!/^3\.\d+\.\d+$/.test(pythonVersion ?? "")) {
    throw new Error("The compatibility catalog must declare a valid pythonVersion");
  }
  const source = `https://raw.githubusercontent.com/astral-sh/uv/${tag}/crates/uv-python-managed/download-metadata.json`;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Unable to fetch ${source}: ${response.status}`);
  const pythonDownloads = selectPythonDownloads(await response.json(), pythonVersion);
  const output = `${JSON.stringify({ pythonDownloads, pythonVersion }, null, 2)}\n`;
  const temporaryPath = `${compatPath}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporaryPath, output, { flag: "wx" });
    await fs.rename(temporaryPath, compatPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  await syncPythonDownloads();
}
