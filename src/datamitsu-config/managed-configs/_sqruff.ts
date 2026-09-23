import { indentSettings } from "../constants";

/**
 * Sqruff SQL config (INI). `dialect` is required — default to ANSI; switch to
 * postgres/mysql/sqlite/etc. and add `[sqruff:...]` sections (rules, indentation) to tune.
 *
 * **Every section is preserved, not just `[sqruff]`.** The generator read the whole file and then
 * wrote one section back, so `[sqruff:rules]`, `[sqruff:indentation]` and every other table a
 * project had tuned disappeared on the next reconciliation — while the comment above promised the
 * opposite. sqruff's configuration lives almost entirely in those sub-sections, so this was most of
 * the config.
 *
 * `.sqruffignore` is no longer listed as an alternative filename either: it is an ignore file, not
 * a config, and naming it there had `datamitsu init` delete it.
 */
export const sqruff: config.ManagedConfig = {
  content: (context) => {
    const existing = INI.toRecord(INI.parse(context.originalContent || ""));
    const { sqruff: managedSection, ...rest } = existing;

    return INI.stringify([
      {
        name: "sqruff",
        properties: { dialect: "ansi", ...managedSection },
      },
      {
        name: "sqruff:indentation",
        properties: {
          indent_unit: "space",
          tab_space_size: String(indentSettings.indentWidth),
          ...rest["sqruff:indentation"],
        },
      },
      ...Object.entries(rest)
        .filter(([name]) => name !== "sqruff:indentation")
        .map(([name, properties]) => ({ name, properties })),
    ]);
  },
  ejectable: true,
  scope: "git-root",
  tools: ["sqruff"],
};
