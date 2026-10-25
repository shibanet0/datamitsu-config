import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const version = process.env.RELEASE_VERSION;
if (!version) throw new Error("RELEASE_VERSION is required");

const manifest = JSON.parse(readFileSync("package.json", "utf8"));
manifest.version = version;
writeFileSync("package.json", JSON.stringify(manifest, null, 2) + "\n");

const githubEnv = process.env.GITHUB_ENV;
if (githubEnv) appendFileSync(githubEnv, `DATAMITSU_CONFIG_VERSION=${version}\n`);
