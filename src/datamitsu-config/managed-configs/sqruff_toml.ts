import { indentSettings } from "../constants";
// cspell:words capitalisation ctes

export const sqruffToml: config.ManagedConfig = {
  content: (context) => {
    let existing = TOML.parse(context.originalContent || "");
    const root =
      existing.tool?.sqruff ??
      existing.tool?.sqlfluff ??
      existing.sqruff ??
      existing.sqlfluff ??
      {};
    const defaults = merge(
      {
        core: {
          dialect: root.dialect ?? "postgres",
          max_line_length: root.max_line_length ?? 0,
          rules: "core,CP03,CP05,CV01,CV06,CV11,LT15",
          templater: root.templater ?? "raw",
        },
        indentation: {
          indent_unit: "space",
          indented_ctes: false,
          indented_joins: false,
          indented_on_contents: true,
          indented_using_on: true,
          tab_space_size: indentSettings.indentWidth,
        },
        layout: {
          type: {
            alias_expression: {
              align_scope: "bracketed",
              align_within: "select_clause",
              spacing_before: "align",
            },
            casting_operator: { spacing_after: "touch:inline", spacing_before: "touch" },
            column_constraint_segment: {
              align_within: "create_table_statement",
              spacing_before: "align",
            },
            comma: { line_position: "trailing", spacing_before: "touch" },
            data_type: { align_within: "create_table_statement", spacing_before: "align" },
            end_bracket: { spacing_before: "touch" },
            start_bracket: { spacing_after: "touch" },
          },
        },
        rules: {
          capitalisation: {
            functions: { extended_capitalisation_policy: "lower" },
            identifiers: { extended_capitalisation_policy: "lower" },
            keywords: { capitalisation_policy: "lower" },
            literals: { capitalisation_policy: "lower" },
            types: { extended_capitalisation_policy: "lower" },
          },
          convention: {
            casting_style: { preferred_type_casting_style: "shorthand" },
            not_equal: { preferred_not_equal_style: "c_style" },
            select_trailing_comma: { select_clause_trailing_comma: "forbid" },
            terminator: { multiline_newline: false, require_final_semicolon: true },
          },
          layout: {
            newlines: {
              maximum_empty_lines_between_statements: 1,
              maximum_empty_lines_inside_statements: 0,
            },
          },
        },
      },
      root,
    );
    if (existing.tool?.sqruff) existing.tool.sqruff = defaults;
    else if (existing.tool?.sqlfluff) existing.tool.sqlfluff = defaults;
    else if (existing.sqruff) existing.sqruff = defaults;
    else if (existing.sqlfluff) existing.sqlfluff = defaults;
    else existing = { ...existing, tool: { ...existing.tool, sqruff: defaults } };
    return TOML.stringify(existing);
  },
  ejectable: true,
  scope: "git-root",
  tools: ["sqruff"],
};
