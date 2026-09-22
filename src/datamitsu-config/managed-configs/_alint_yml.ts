import { ALINT_MANAGED_PATH } from "../alint-defaults";

// alint (repository-structure linter) config. Extends the bundled `oss-baseline` ruleset and the
// managed naming rules in .datamitsu/alint-managed.yml; layer more bundled sets (rust, node,
// python, go, ci/github-actions, …) or add your own rules. A rule redefined here by `id`
// overrides the managed one.
const OSS_BASELINE = "alint://bundled/oss-baseline@v1";

export const alintYml: config.ManagedConfig = {
  content: (context) => {
    const { extends: declared, ...data } = YAML.parse(context.originalContent || "") ?? {};

    const list: string[] =
      declared === undefined ? [OSS_BASELINE] : Array.isArray(declared) ? declared : [declared];
    // alint 0.15 reads a bare `oss-baseline` as a local path and rejects the whole config; it
    // was this generator's default until the bundled URI replaced it.
    const normalized = list.map((entry) => (entry === "oss-baseline" ? OSS_BASELINE : entry));
    const withManaged = normalized.includes(ALINT_MANAGED_PATH)
      ? normalized
      : [...normalized, ALINT_MANAGED_PATH];

    // datamitsu links .datamitsu/alint-managed.yml into its store, outside the repository, and
    // alint refuses a local `extends` that resolves outside the linted tree unless this is set.
    return YAML.stringify({ extends: withManaged, version: 1, ...data, allow_out_of_root: true });
  },
  otherFileNameList: [".alint.yaml"],
  scope: "git-root",
  tools: ["alint"],
};
