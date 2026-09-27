import { name as selfName, version as selfVersion } from "../../../package.json";

export const pnpmWorkspaceYaml: config.ManagedConfig = {
  content: (context) => {
    // https://github.com/pnpm/plugin-better-defaults
    const existing = YAML.parse(context.originalContent || "");
    const base = {
      ...pnpmWorkspaceDefaults,
      ...existing,
    };

    const legacyTrustPolicy = base.trustPolicy;
    if (
      legacyTrustPolicy &&
      typeof legacyTrustPolicy === "object" &&
      "allowDowngrade" in legacyTrustPolicy
    ) {
      const legacyExclude = legacyTrustPolicy.allowDowngrade;
      const currentExclude = base.trustPolicyExclude ?? [];
      if (
        !Array.isArray(legacyExclude) ||
        legacyExclude.some((entry) => typeof entry !== "string") ||
        !Array.isArray(currentExclude) ||
        currentExclude.some((entry) => typeof entry !== "string")
      ) {
        throw new Error(
          "Cannot migrate trustPolicy.allowDowngrade: it and trustPolicyExclude must be lists of package selectors",
        );
      }
      base.trustPolicyExclude = [...new Set([...currentExclude, ...legacyExclude])];
      base.trustPolicy = "no-downgrade";
    }

    const allowBuilds = {
      ...base?.allowBuilds,
    };

    delete allowBuilds["@shibanet0/datamitsu-config"];

    // pnpm 12 no longer knows these, and it fails every command on a workspace setting it does not
    // know (ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS), so strip them from existing files too. Some
    // were dropped outright; confirmModulesPurge went because pnpm 12 purges without asking, and
    // useNodeVersion's job is done by devEngines.runtime, which the managed package.json writes.
    for (const removed of [
      "confirmModulesPurge",
      "ignoreDepScripts",
      "ignorePatchFailures",
      "managePackageManagerVersions",
      "packageManagerStrict",
      "packageManagerStrictVersion",
      "useNodeVersion",
    ]) {
      delete base[removed];
    }

    // Renamed in pnpm 12. The value carries over; a file that already uses the new name keeps its own.
    if ("allowNonAppliedPatches" in base) {
      base.allowUnusedPatches ??= base.allowNonAppliedPatches;
      delete base.allowNonAppliedPatches;
    }

    // pnpm 12 reads its audit settings from `audit` (level, ignore, ignorePrune) and keeps
    // `auditLevel` only as a deprecated alias. The level is this config's; everything else in the
    // section is the project's — `pnpm audit --ignore` writes its exceptions there — and survives.
    const existingAudit = base.audit ?? {};
    if (typeof existingAudit !== "object" || Array.isArray(existingAudit)) {
      throw new Error("Cannot merge audit: it must be a mapping of pnpm audit settings");
    }
    delete base.auditLevel;

    // Single source of truth for the config package version: every package.json
    // references it as `catalog:`, so a bump only touches this one entry.
    const catalog = Object.fromEntries(
      Object.entries({
        ...base?.catalog,
        [selfName]: selfVersion,
      }).sort(([a], [b]) => a.localeCompare(b)),
    );

    const config = {
      ...base,
      allowBuilds,
      audit: { ...existingAudit, level: "high" },
      autoInstallPeers: true,
      catalog,
      dedupeDirectDeps: true,
      dedupePeerDependents: true,
      enableGlobalVirtualStore: true,
      enablePrePostScripts: false,
      engineStrict: true,
      hoistPattern: [],
      optimisticRepeatInstall: true,
      resolutionMode: "lowest-direct",
      savePrefix: "",
      strictSsl: true,
      trustLockfile: true,
      unsafePerm: false,
      updateNotifier: false,
      verifyDepsBeforeRun: "install",
      verifyStoreIntegrity: true,
    };

    if (config.hoistPattern?.length === 1 && config.hoistPattern[0] === "*") {
      config.hoistPattern = [];
    }

    return YAML.stringify(
      Object.fromEntries(Object.entries(config).sort(([a], [b]) => a.localeCompare(b))),
    );
  },
  projectTypes: ["pnpm-package"],
  scope: "git-root",
};
