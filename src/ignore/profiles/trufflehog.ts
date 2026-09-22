import type { FlatProfile } from "../profile";

export const trufflehogProfile: FlatProfile = {
  refs: ["lockFiles", "snapshots", "testdata", "fixtures", "minified", "bundled"],
  syntax: "regex",
};
