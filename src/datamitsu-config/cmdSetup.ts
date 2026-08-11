import { alintYml } from "./setup/_alint_yml";
import { checkEmptyFilesSh } from "./setup/_datamitsu_scripts_check_empty_files_sh";
import { formatTerraformSpacingSh } from "./setup/_datamitsu_scripts_format_terraform_spacing_sh";
import { dclintYaml } from "./setup/_dclint_yaml";
import { dockerignore } from "./setup/_dockerignore";
import { editorconfig } from "./setup/_editorconfig";
import { editorconfigCheckerJson } from "./setup/_editorconfig_checker_json";
import { githubDependabotYml } from "./setup/_github_dependabot_yml";
import { githubZizmorYml } from "./setup/_github_zizmor_yml";
import { gitignore } from "./setup/_gitignore";
import { gitleaksToml } from "./setup/_gitleaks_toml";
import { golangciYaml } from "./setup/_golangci_yaml";
import { lsLintYml } from "./setup/_ls_lint_yml";
import { nodeVersion } from "./setup/_node_version";
import { npmrc } from "./setup/_npmrc";
import { oxlintrcJson } from "./setup/_oxlintrc_json";
import { pinactYaml } from "./setup/_pinact_yaml";
import { sqruff } from "./setup/_sqruff";
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
import { denyToml } from "./setup/deny_toml";
import { deprecatedConfigs } from "./setup/deprecated_configs";
import { eslintConfigMjs } from "./setup/eslint_config_mjs";
import { hadolintYaml } from "./setup/hadolint_yaml";
import { knipConfigJs } from "./setup/knip_config_js";
import { lefthookYaml } from "./setup/lefthook_yaml";
import { mdsfJson } from "./setup/mdsf_json";
import { oxfmtConfigTs } from "./setup/oxfmt_config_ts";
import { packageJson } from "./setup/package_json";
import { pnpmWorkspaceYaml } from "./setup/pnpm_workspace_yaml";
import { prettierConfigMjs } from "./setup/prettier_config_mjs";
import { pyprojectToml } from "./setup/pyproject_toml";
import { rustfmtToml } from "./setup/rustfmt_toml";
import { turboJson } from "./setup/turbo_json";
import { tyToml } from "./setup/ty_toml";

export { trufflehogExcludePaths } from "./setup/_trufflehog_exclude_paths_txt";

export const setup: config.MapOfConfigSetup = {
  ".alint.yml": alintYml,
  ".datamitsu/scripts/check-empty-files.sh": checkEmptyFilesSh,
  ".datamitsu/scripts/format-terraform-spacing.sh": formatTerraformSpacingSh,
  ".dclint.yaml": dclintYaml,
  ".dockerignore": dockerignore,
  ".editorconfig": editorconfig,
  ".editorconfig-checker.json": editorconfigCheckerJson,
  ".github/dependabot.yml": githubDependabotYml,
  ".github/zizmor.yml": githubZizmorYml,
  ".gitignore": gitignore,
  ".gitleaks.toml": gitleaksToml,
  ".golangci.yaml": golangciYaml,
  ".ls-lint.yml": lsLintYml,
  ".node-version": nodeVersion,
  ".npmrc": npmrc,
  ".oxlintrc.json": oxlintrcJson,
  ".pinact.yaml": pinactYaml,
  ".sqruff": sqruff,
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
  "deny.toml": denyToml,
  "deprecated-configs": deprecatedConfigs,
  "eslint.config.mjs": eslintConfigMjs,
  "hadolint.yaml": hadolintYaml,
  "knip.config.js": knipConfigJs,
  "lefthook.yaml": lefthookYaml,
  "mdsf.json": mdsfJson,
  "oxfmt.config.ts": oxfmtConfigTs,
  "package.json": packageJson,
  "pnpm-workspace.yaml": pnpmWorkspaceYaml,
  "prettier.config.mjs": prettierConfigMjs,
  "pyproject.toml": pyprojectToml,
  "rustfmt.toml": rustfmtToml,
  "turbo.json": turboJson,
  "ty.toml": tyToml,
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
