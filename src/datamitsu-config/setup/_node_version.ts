import { runtimeVersions } from "../constants";

export const nodeVersion: config.ConfigSetup = {
  content: () => {
    return runtimeVersions.node + "\n";
  },
  scope: "git-root",
};
