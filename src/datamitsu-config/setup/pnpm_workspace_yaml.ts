import { name as selfName, version as selfVersion } from "../../../package.json";

export const pnpmWorkspaceYaml: config.ConfigSetup = {
  content: (context) => {
    // https://github.com/pnpm/plugin-better-defaults
    const existing = YAML.parse(context.originalContent || "");
    const base = {
      ...pnpmWorkspaceDefaults,
      ...existing,
    };

    const allowBuilds = {
      ...base?.allowBuilds,
    };

    delete allowBuilds["@shibanet0/datamitsu-config"];

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
      audit: true,
      auditLevel: "high",
      autoInstallPeers: true,
      catalog,
      dedupeDirectDeps: true,
      dedupePeerDependents: true,
      enableGlobalVirtualStore: true,
      enablePrePostScripts: false,
      engineStrict: true,
      hoistPattern: [],
      ignorePatchFailures: false,
      optimisticRepeatInstall: true,
      packageManagerStrict: true,
      packageManagerStrictVersion: true,
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
