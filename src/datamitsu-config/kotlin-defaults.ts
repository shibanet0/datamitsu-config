import { indentSettings, KOTLIN_STAR_IMPORT_THRESHOLD } from "./constants";

// The preset also owns layout, which conflicts with ktfmt. Only identifier and syntax checks run.
const enabledRules = [
  "backing-property-naming",
  "class-naming",
  "enum-entry-name-case",
  "function-expression-body",
  "function-naming",
  "mixed-condition-operators",
  "modifier-order",
  "no-unit-return",
  "no-wildcard-imports",
  "package-name",
  "property-naming",
  "string-template",
  "unnecessary-parentheses-before-trailing-lambda",
] as const;

export const kotlinEditorConfig: Record<string, string> = {
  ij_continuation_indent_size: String(indentSettings.indentWidth),
  ij_kotlin_allow_trailing_comma: "true",
  ij_kotlin_allow_trailing_comma_on_call_site: "true",
  ij_kotlin_code_style_defaults: "KOTLIN_OFFICIAL",
  ij_kotlin_imports_layout: "*",
  ij_kotlin_name_count_to_use_star_import: String(KOTLIN_STAR_IMPORT_THRESHOLD),
  ij_kotlin_name_count_to_use_star_import_for_members: String(KOTLIN_STAR_IMPORT_THRESHOLD),
  ij_kotlin_packages_to_use_import_on_demand: "unset",
  indent_size: String(indentSettings.indentWidth),
  indent_style: "space",
  ktfmt_trailing_comma_management_strategy: "complete",
  ktlint_code_style: "ktlint_official",
  ktlint_enum_entry_name_casing: "upper_or_camel_cases",
  ktlint_function_naming_ignore_when_annotated_with: "Composable",
  ktlint_property_naming_constant_naming: "screaming_snake_case",
  ktlint_standard: "disabled",
  max_line_length: String(indentSettings.lineWidth),
  ...Object.fromEntries(enabledRules.map((rule) => [`ktlint_standard_${rule}`, "enabled"])),
};
