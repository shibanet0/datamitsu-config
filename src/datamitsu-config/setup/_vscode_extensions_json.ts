import { vscodeExtensions } from "../int-config/vscode";

export const vscodeExtensionsJson: config.ConfigSetup = {
  content: vscodeExtensions,
  scope: "git-root",
};
