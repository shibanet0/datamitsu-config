import type { FlatProfile } from "../profile";

// What the JSON key sorter must not touch: a manifest whose key order `sort-package-json` owns,
// a lock file, and an encrypted document whose byte order its MAC is computed over.
export const jsonExcludeProfile: FlatProfile = {
  refs: ["packageJsonFile", "packageLock", "jsonEncrypted", "encJson"],
  syntax: "glob",
};
