import type { PackageJson } from "type-fest";

// Frameworks whose own .js config files (next.config.js, metro.config.js,
// docusaurus.config.js, gatsby-*.js, the Electron main process) are authored as
// CommonJS and break when the package is marked `type: "module"`. For these we
// leave `type` UNSET (return undefined → the field is omitted) rather than
// writing an explicit `type: "commonjs"`: an unset type still lets Node load the
// CommonJS config files (`.js` defaults to CommonJS), while an explicit
// `commonjs` breaks bundlers that emit ESM — e.g. Docusaurus' client build fails
// with "'import'/'export' cannot be used outside of module code". Everything else
// gets `type: "module"`.
const UNSET_TYPE_ECOSYSTEM_DEPENDENCIES = new Set([
  "@docusaurus/core",
  "electron",
  "expo",
  "gatsby",
  "next",
  "react-native",
]);

// Returns the `type` value to write, or undefined to leave `type` unset (omitted
// from package.json — see the consumer in setup/package_json.ts).
export const detectPackageType = (data: PackageJson): "module" | undefined => {
  const dependencyNames = [
    data.dependencies,
    data.devDependencies,
    data.peerDependencies,
    data.optionalDependencies,
  ].flatMap((deps) => (deps ? Object.keys(deps) : []));

  return dependencyNames.some((name) => UNSET_TYPE_ECOSYSTEM_DEPENDENCIES.has(name))
    ? undefined
    : "module";
};
