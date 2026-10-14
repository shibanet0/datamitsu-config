import { data } from "../inline-config/protolint-fix";

export const protolintFixApp: BinManager.App = {
  archives: { main: { inline: data } },
  dependsOn: ["protolint"],
  description: "Native protolint fixes followed by verification of the corrected file",
  go: {
    lockFile:
      "br:G0UAGIyTXOF12e68Xu1mcDhc907RyuZAKQkR2IAD9yCYdB1I7g4jUpwyT2aFIhiU8F4HQz/j32DdrvElJe3TREwZAynYdcQDHw==",
    packageName: "datamitsu.local/protolint-fix",
    version: "v0.0.0",
  },
  versionCheck: { disabled: true },
};
