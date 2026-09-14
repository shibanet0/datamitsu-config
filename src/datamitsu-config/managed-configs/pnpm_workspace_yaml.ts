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

    // Removed in pnpm 12 with no replacement; pnpm now hard-errors on
    // unrecognized workspace settings, so strip them from existing files too.
    for (const removed of [
      "ignorePatchFailures",
      "packageManagerStrict",
      "packageManagerStrictVersion",
    ]) {
      delete base[removed];
    }

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
      audit: {},
      auditLevel: "high",
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
