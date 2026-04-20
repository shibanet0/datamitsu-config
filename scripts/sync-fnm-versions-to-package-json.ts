import fsPromise from "node:fs/promises";
import path from "node:path";

const fnmVersionsPath = path.join(
  import.meta.dirname,
  "../src/datamitsu-config/registries/fnmVersions.json",
);
const packageJsonPath = path.join(import.meta.dirname, "../package.json");

const fnmVersions = JSON.parse(await fsPromise.readFile(fnmVersionsPath, "utf8")) as Record<
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

if (fnmVersions.pnpm.version && packageJson.packageManager?.startsWith("pnpm@")) {
  packageJson.packageManager = `pnpm@${fnmVersions.pnpm.version}`;
}

for (const [_, { packageName, version }] of Object.entries(fnmVersions)) {
  if (packageJson.dependencies?.[packageName] !== undefined) {
    packageJson.dependencies[packageName] = version;
  }
  if (packageJson.devDependencies?.[packageName] !== undefined) {
    packageJson.devDependencies[packageName] = version;
  }
}

await fsPromise.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n", "utf8");
