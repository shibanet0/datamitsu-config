import { checkEmptyFilesSh } from "./setup/_datamitsu_scripts_check_empty_files_sh";
import { formatTerraformSpacingSh } from "./setup/_datamitsu_scripts_format_terraform_spacing_sh";
import { dockerignore } from "./setup/_dockerignore";
import { editorconfig } from "./setup/_editorconfig";
import { editorconfigCheckerJson } from "./setup/_editorconfig_checker_json";
import { githubDependabotYml } from "./setup/_github_dependabot_yml";
import { gitignore } from "./setup/_gitignore";
import { gitleaksToml } from "./setup/_gitleaks_toml";
import { golangciYaml } from "./setup/_golangci_yaml";
import { nodeVersion } from "./setup/_node_version";
import { npmrc } from "./setup/_npmrc";
import { oxlintrcJson } from "./setup/_oxlintrc_json";
import { syncpackrcJson } from "./setup/_syncpackrc_json";
import { tflintHcl } from "./setup/_tflint_hcl";
import { tombiToml } from "./setup/_tombi_toml";
import { trufflehogExcludePathsTxt } from "./setup/_trufflehog_exclude_paths_txt";
import { valeIni } from "./setup/_vale_ini";
import { vscodeExtensionsJson } from "./setup/_vscode_extensions_json";
import { vscodeSettingsJson } from "./setup/_vscode_settings_json";
import { yamlfmtYaml } from "./setup/_yamlfmt_yaml";
import { yamllintYaml } from "./setup/_yamllint_yaml";
import { aiTools } from "./setup/aiTools";
import { commitlintConfigMjs } from "./setup/commitlint_config_mjs";
import { cspellConfigMjs } from "./setup/cspell_config_mjs";
import { deprecatedConfigs } from "./setup/deprecated_configs";
import { eslintConfigMjs } from "./setup/eslint_config_mjs";
import { hadolintYaml } from "./setup/hadolint_yaml";
import { knipConfigJs } from "./setup/knip_config_js";
import { lefthookYaml } from "./setup/lefthook_yaml";
import { oxfmtConfigTs } from "./setup/oxfmt_config_ts";
import { packageJson } from "./setup/package_json";
import { pnpmWorkspaceYaml } from "./setup/pnpm_workspace_yaml";
import { prettierConfigMjs } from "./setup/prettier_config_mjs";
import { pyprojectToml } from "./setup/pyproject_toml";
import { rustfmtToml } from "./setup/rustfmt_toml";
import { turboJson } from "./setup/turbo_json";

export { trufflehogExcludePaths } from "./setup/_trufflehog_exclude_paths_txt";

export const setup: config.MapOfConfigSetup = {
  ".datamitsu/scripts/check-empty-files.sh": checkEmptyFilesSh,
  ".datamitsu/scripts/format-terraform-spacing.sh": formatTerraformSpacingSh,
  ".dockerignore": dockerignore,
  ".editorconfig": editorconfig,
  ".editorconfig-checker.json": editorconfigCheckerJson,
  ".github/dependabot.yml": githubDependabotYml,
  ".gitignore": gitignore,
  ".gitleaks.toml": gitleaksToml,
  ".golangci.yaml": golangciYaml,
  ".node-version": nodeVersion,
  ".npmrc": npmrc,
  ".oxlintrc.json": oxlintrcJson,
  ".syncpackrc.json": syncpackrcJson,
  ".tflint.hcl": tflintHcl,
  ".tombi.toml": tombiToml,
  ".trufflehog-exclude-paths.txt": trufflehogExcludePathsTxt,
  ".vale.ini": valeIni,
  ".vscode/extensions.json": vscodeExtensionsJson,
  ".vscode/settings.json": vscodeSettingsJson,
  ".yamlfmt.yaml": yamlfmtYaml,
  ".yamllint.yaml": yamllintYaml,
  "commitlint.config.mjs": commitlintConfigMjs,
  "cspell.config.mjs": cspellConfigMjs,
  "deprecated-configs": deprecatedConfigs,
  "eslint.config.mjs": eslintConfigMjs,
  "hadolint.yaml": hadolintYaml,
  "knip.config.js": knipConfigJs,
  "lefthook.yaml": lefthookYaml,
  "oxfmt.config.ts": oxfmtConfigTs,
  "package.json": packageJson,
  "pnpm-workspace.yaml": pnpmWorkspaceYaml,
  "prettier.config.mjs": prettierConfigMjs,
  "pyproject.toml": pyprojectToml,
  "rustfmt.toml": rustfmtToml,
  "turbo.json": turboJson,
  ...aiTools,
};

export const initCommands: config.MapOfInitCommands = {
  lefthook: {
    args: ["install", "--force"],
    command: "lefthook",
    description: "Install git hooks with lefthook",
    when: "lefthook.yaml",
  },
};
