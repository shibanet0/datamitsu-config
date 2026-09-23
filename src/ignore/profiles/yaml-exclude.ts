import type { FlatProfile } from "../profile";

// What the YAML formatters must not touch: a lock file, and SOPS documents, whose MAC covers the
// values in the order they appear.
export const yamlExcludeProfile: FlatProfile = {
  refs: [
    "pnpmLock",
    "sopsYaml",
    "sopsYmlEncrypted",
    "sopsYml",
    "yamlEncrypted",
    "ymlEncrypted",
    "encYaml",
    "encYml",
  ],
  syntax: "glob",
};
