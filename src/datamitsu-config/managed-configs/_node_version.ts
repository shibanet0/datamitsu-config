import { runtimeVersions } from "../constants";

export const nodeVersion: config.ManagedConfig = {
  content: () => {
    return runtimeVersions.node + "\n";
  },
  scope: "git-root",
};
