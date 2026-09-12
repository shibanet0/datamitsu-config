import { vscodeSettings } from "../int-config/vscode";

export const vscodeSettingsJson: config.ManagedConfig = {
  content: vscodeSettings,
  scope: "git-root",
};
