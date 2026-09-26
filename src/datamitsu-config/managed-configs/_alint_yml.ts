import { ALINT_MANAGED_FILE } from "../alint-defaults";

// alint (repository-structure linter) config. Extends the bundled `oss-baseline` ruleset and the
// managed naming rules in .datamitsu/alint-managed.yml; layer more bundled sets (rust, node,
// python, go, …) or add your own rules. A rule redefined here by `id` overrides the managed one.
// Not ci/github-actions: actionlint, pinact and zizmor own workflows, and that set's pinning
// rule contradicts zizmor on `uses: ./…` versus `uses: $/…`.
const OSS_BASELINE = "alint://bundled/oss-baseline@v1";

export const alintYml: config.ManagedConfig = {
  content: (context) => {
    const { extends: declared, ...data } = YAML.parse(context.originalContent || "") ?? {};

    const list: string[] =
      declared === undefined ? [OSS_BASELINE] : Array.isArray(declared) ? declared : [declared];
    // alint 0.15 reads a bare `oss-baseline` as a local path and rejects the whole config; it
    // was this generator's default until the bundled URI replaced it.
    const normalized = list.map((entry) => (entry === "oss-baseline" ? OSS_BASELINE : entry));
    // alint resolves a local `extends` against the config's own directory, which is
    // .datamitsu/configs/ when the project has not ejected this file.
    const managedPath = `${context.datamitsuDirFromOutput ?? ".datamitsu"}/${ALINT_MANAGED_FILE}`;
    const withManaged = normalized.includes(managedPath)
      ? normalized
      : [...normalized, managedPath];

    // datamitsu links .datamitsu/alint-managed.yml into its store, outside the repository, and
    // alint refuses a local `extends` that resolves outside the linted tree unless this is set.
    return YAML.stringify({ extends: withManaged, version: 1, ...data, allow_out_of_root: true });
  },
  ejectable: true,
  otherFileNameList: [".alint.yaml"],
  scope: "git-root",
  tools: ["alint"],
};
