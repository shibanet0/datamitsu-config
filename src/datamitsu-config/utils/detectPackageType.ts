import type { PackageJson } from "type-fest";

// Frameworks whose own .js config files (next.config.js, metro.config.js,
// docusaurus.config.js, gatsby-*.js, the Electron main process) are authored as
// CommonJS and break when the package is marked `type: "module"`. When a package
// depends on one of these and hasn't pinned its own `type`, default to commonjs
// instead of module so those config files keep loading.
const COMMONJS_ECOSYSTEM_DEPENDENCIES = new Set([
  "@docusaurus/core",
  "electron",
  "expo",
  "gatsby",
  "next",
  "react-native",
]);

export const detectPackageType = (data: PackageJson): "commonjs" | "module" => {
  const dependencyNames = [
    data.dependencies,
    data.devDependencies,
    data.peerDependencies,
    data.optionalDependencies,
  ].flatMap((deps) => (deps ? Object.keys(deps) : []));

  return dependencyNames.some((name) => COMMONJS_ECOSYSTEM_DEPENDENCIES.has(name))
    ? "commonjs"
    : "module";
};
