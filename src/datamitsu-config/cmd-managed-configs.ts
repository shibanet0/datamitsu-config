import { alintYml } from "./managed-configs/_alint_yml";
import { checkEmptyFilesSh } from "./managed-configs/_datamitsu_scripts_check_empty_files_sh";
import { formatTerraformSpacingSh } from "./managed-configs/_datamitsu_scripts_format_terraform_spacing_sh";
import { dclintYaml } from "./managed-configs/_dclint_yaml";
import { dockerignore } from "./managed-configs/_dockerignore";
import { editorconfig } from "./managed-configs/_editorconfig";
import { editorconfigCheckerJson } from "./managed-configs/_editorconfig_checker_json";
import { githubDependabotYml } from "./managed-configs/_github_dependabot_yml";
import { githubZizmorYml } from "./managed-configs/_github_zizmor_yml";
import { gitignore } from "./managed-configs/_gitignore";
import { gitleaksToml } from "./managed-configs/_gitleaks_toml";
import { golangciYaml } from "./managed-configs/_golangci_yaml";
import { lsLintYml } from "./managed-configs/_ls_lint_yml";
import { nodeVersion } from "./managed-configs/_node_version";
import { npmrc } from "./managed-configs/_npmrc";
import { pinactYaml } from "./managed-configs/_pinact_yaml";
import { sqruff } from "./managed-configs/_sqruff";
import { syncpackrcJson } from "./managed-configs/_syncpackrc_json";
import { tflintHcl } from "./managed-configs/_tflint_hcl";
import { tombiToml } from "./managed-configs/_tombi_toml";
import { trufflehogExcludePathsTxt } from "./managed-configs/_trufflehog_exclude_paths_txt";
import { valeIni } from "./managed-configs/_vale_ini";
import { vscodeExtensionsJson } from "./managed-configs/_vscode_extensions_json";
import { vscodeSettingsJson } from "./managed-configs/_vscode_settings_json";
import { yamlfmtYaml } from "./managed-configs/_yamlfmt_yaml";
import { yamllintYaml } from "./managed-configs/_yamllint_yaml";
import { aiTools } from "./managed-configs/ai-tools";
import { commitlintConfigMjs } from "./managed-configs/commitlint_config_mjs";
import { cspellConfigMjs } from "./managed-configs/cspell_config_mjs";
import { denyToml } from "./managed-configs/deny_toml";
import { deprecatedConfigs } from "./managed-configs/deprecated_configs";
import { droastToml } from "./managed-configs/droast_toml";
import { eslintConfigMjs } from "./managed-configs/eslint_config_mjs";
import { hadolintYaml } from "./managed-configs/hadolint_yaml";
import { knipConfigJs } from "./managed-configs/knip_config_js";
import { lefthookYaml } from "./managed-configs/lefthook_yaml";
import { mdsfJson } from "./managed-configs/mdsf_json";
import { oxfmtConfigTs } from "./managed-configs/oxfmt_config_ts";
import { oxlintConfigMts } from "./managed-configs/oxlint_config_mts";
import { packageJson } from "./managed-configs/package_json";
import { pnpmWorkspaceYaml } from "./managed-configs/pnpm_workspace_yaml";
import { prettierConfigMjs } from "./managed-configs/prettier_config_mjs";
import { pyprojectToml } from "./managed-configs/pyproject_toml";
import { rustfmtToml } from "./managed-configs/rustfmt_toml";
import { stylelintConfigMjs } from "./managed-configs/stylelint_config_mjs";
import { turboJson } from "./managed-configs/turbo_json";
import { tyToml } from "./managed-configs/ty_toml";

export const managedConfigs: config.MapOfManagedConfigs = {
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
  "droast.toml": droastToml,
  "eslint.config.mjs": eslintConfigMjs,
  "hadolint.yaml": hadolintYaml,
  "knip.config.js": knipConfigJs,
  "lefthook.yaml": lefthookYaml,
  "mdsf.json": mdsfJson,
  "oxfmt.config.ts": oxfmtConfigTs,
  "oxlint.config.mts": oxlintConfigMts,
  "package.json": packageJson,
  "pnpm-workspace.yaml": pnpmWorkspaceYaml,
  "prettier.config.mjs": prettierConfigMjs,
  "pyproject.toml": pyprojectToml,
  "rustfmt.toml": rustfmtToml,
  "stylelint.config.mjs": stylelintConfigMjs,
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
