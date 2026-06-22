import { vscodeSettings } from "../int-config/vscode";

export const vscodeSettingsJson: config.ConfigSetup = {
  content: vscodeSettings,
  scope: "git-root",
};
