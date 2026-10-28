export const lefthookYaml: config.ManagedConfig = {
  content: (context) => {
    const existing = YAML.parse(context.originalContent || "");

    return YAML.stringify({
      ...existing,
      "commit-msg": {
        commands: {
          "lint commit message": {
            run: `${facts().binaryCommand} exec commitlint -- --edit {1}`,
          },
        },
      },
      glob_matcher: "doublestar",
      "post-checkout": {
        ...existing?.["post-checkout"],
        commands: {
          ...existing?.["post-checkout"]?.commands,
          // A branch switch can bring in new subprojects; init refreshes the
          // launcher marker and this creates their missing configs.
          [`${facts().packageName}-ensure-configs`]: {
            priority: 3,
            run: `${facts().binaryCommand} config reconcile --create-missing --no-verify-hash`,
          },
          [`init ${facts().packageName}`]: {
            priority: 2,
            run: `${facts().binaryCommand} init`,
          },
          [`init ${facts().packageName}`]: {
            priority: 2,
            run: `${facts().binaryCommand} init`,
          },
          "install deps": {
            priority: 1,
            run: `pnpm i -y`,
          },
        },
        // priority is only honoured for sequential hooks
        parallel: false,
      },
      "pre-commit": {
        // Priorities are assigned in phase bands so the file reads top-to-bottom
        // in execution order (lefthook runs lowest priority first):
        //   fix   10–90   mutators that rewrite/stage files
        //   check 100–190 validations that only read
        //   test  200+    slower verification
        // Downstream projects slot their own commands into the same bands.
        // Sorting and validating the lefthook config itself are not commands
        // here: they are the `lefthook-sort` (fix) and `lefthook-validate`
        // (lint) tools, so they run inside `check` like every other tool.
        commands: {
          ...existing?.["pre-commit"]?.commands,
          [`${facts().packageName}-check`]: {
            priority: 40,
            run: `${facts().binaryCommand} check --file-scoped`,
            stage_fixed: true,
          },
          // Runs between init and check so a subproject newly added to a
          // monorepo gets its missing managed configs created before the check
          // reads them. Idempotent by contract: every existing file stays
          // byte-for-byte untouched, so steady-state runs are no-ops.
          // --no-verify-hash belongs here: create-missing never overwrites, so
          // the chain-hash gate (which protects overwrites) has nothing to
          // guard, and a pin baked under a different invocation channel would
          // otherwise break this hook.
          [`${facts().packageName}-ensure-configs`]: {
            priority: 15,
            run: `${facts().binaryCommand} config reconcile --create-missing --no-verify-hash`,
          },
          [`${facts().packageName}-init`]: {
            priority: 10,
            run: `${facts().binaryCommand} init`,
          },
        },
        parallel: false,
      },
    });
  },
  otherFileNameList: [
    ".lefthook.yml",
    "lefthook.yaml",
    ".config/lefthook.yml",
    ".lefthook.yaml",
    ".config/lefthook.yaml",
    "lefthook.toml",
    ".lefthook.toml",
    ".config/lefthook.toml",
    "lefthook.json",
    ".lefthook.json",
    ".config/lefthook.json",
  ],
  scope: "git-root",
};
