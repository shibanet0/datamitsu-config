export const pnpmWorkspaceConfig: Record<string, any> = {
  enableGlobalVirtualStore: true,
  enablePrePostScripts: false,
  hoistPattern: [],
  optimisticRepeatInstall: true,
  resolutionMode: "lowest-direct",
  verifyDepsBeforeRun: "install",
};

export const pnpmWorkspaceConfigYAML = YAML.stringify(pnpmWorkspaceConfig);
