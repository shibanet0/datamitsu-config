import { vscodeExtensions } from "../int-config/vscode";

export const vscodeExtensionsJson: config.ManagedConfig = {
  content: vscodeExtensions,
  scope: "git-root",
};
