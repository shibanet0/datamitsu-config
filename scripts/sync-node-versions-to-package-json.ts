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

for (const [_, { packageName, version }] of Object.entries(nodeVersions)) {
  if (packageJson.dependencies?.[packageName] !== undefined) {
    packageJson.dependencies[packageName] = version;
  }
  if (packageJson.devDependencies?.[packageName] !== undefined) {
    packageJson.devDependencies[packageName] = version;
  }
}

await fsPromise.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n", "utf8");
