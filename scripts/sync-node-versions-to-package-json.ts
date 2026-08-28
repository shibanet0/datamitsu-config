import fsPromise from "node:fs/promises";
import path from "node:path";

const nodeVersionsPath = path.join(
  import.meta.dirname,
  "../src/datamitsu-config/registries/nodeVersions.json",
);
const packageJsonPath = path.join(import.meta.dirname, "../package.json");

const nodeVersions = JSON.parse(await fsPromise.readFile(nodeVersionsPath, "utf8")) as Record<
  string,
  {
    packageName: string;
    version: string;
  }
>;

const packageJson = JSON.parse(await fsPromise.readFile(packageJsonPath, "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  packageManager?: string;
};

if (nodeVersions.pnpm.version && packageJson.packageManager?.startsWith("pnpm@")) {
  packageJson.packageManager = `pnpm@${nodeVersions.pnpm.version}`;
}

// Registry entries whose version pins the *shipped app* only, and must not be
// mirrored into this repo's own dependencies.
//
// `typescript`: the registry pins the `tsc` app at 7.x. That app just runs the
// native (Go) `tsc` binary, so it is happy there — but this repo's own build is
// not. typescript-eslint hard-rejects it ("typescript-eslint does not support
// TS 7.0"), and no released version accepts `typescript >= 6.1.0`, while
// `scripts/inject-jsdoc.ts` needs the classic JS compiler API that TS 7 dropped
// (`typescript@7` exports only `version`/`versionMajorMinor`; the AST moved
// behind `typescript/unstable/*`, which has a scanner but no parser or printer).
// The shipped eslint app is unaffected — it installs its own typescript 6.x.
// Drop this entry once typescript-eslint supports TS 7.
const appOnlyPackages = new Set(["typescript"]);

for (const [_, { packageName, version }] of Object.entries(nodeVersions)) {
  if (appOnlyPackages.has(packageName)) {
    continue;
  }
  if (packageJson.dependencies?.[packageName] !== undefined) {
    packageJson.dependencies[packageName] = version;
  }
  if (packageJson.devDependencies?.[packageName] !== undefined) {
    packageJson.devDependencies[packageName] = version;
  }
}

await fsPromise.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n", "utf8");
