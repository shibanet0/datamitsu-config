import { indentSettings } from "../constants";

/**
 * The sections this generator owns. Everything else in the file is the project's.
 *
 * Order is not presentation here: EditorConfig applies every matching section in file order and the
 * last one wins, so a project that narrows `[*.md]` after a broad `[*.{md,markdown}]` depends on
 * that order. Rebuilding the file as "managed first, then the rest" reversed exactly that pair and
 * quietly handed Markdown back to `trim_trailing_whitespace = true` — which is the setting that
 * eats a hard line break. So sections keep the position they had, and only the ones this generator
 * owns are updated in place; new managed sections are appended, ahead of nothing.
 */
const MANAGED_SECTIONS = ["DEFAULT", "*", "*.md", "*.markdown", "GNUmakefile", "Makefile"] as const;

type SectionName = (typeof MANAGED_SECTIONS)[number];

/**
 * `utf8` is not one of the values the specification defines (latin1, utf-8, utf-8-bom, utf-16be,
 * utf-16le), and earlier versions of this generator wrote it. It is replaced rather than preserved:
 * keeping an invalid value because a project "already has" it only means the project keeps a
 * charset no reader recognizes.
 */
/**
 * The spelling EditorConfig defines, kept in one constant because the autofixer rewrites it in
 * place otherwise: `unicorn/text-encoding-identifier-case` prefers Node's `utf8`, which is right
 * for `readFile` and wrong for this file — and `dm fix` silently applied it to both occurrences.
 */
// oxlint-disable-next-line unicorn/text-encoding-identifier-case
const CHARSET = "utf-8";

const normalizeCharset = (properties: Record<string, string>): Record<string, string> =>
  properties["charset"] === "utf8" ? { ...properties, charset: CHARSET } : properties;

export const editorconfig: config.ManagedConfig = {
  content: (context) => {
    // https://editorconfig.org
    // https://github.com/editorconfig/editorconfig/wiki/EditorConfig-Properties
    const parsed = INI.parse(context.originalContent || "");
    const existing = INI.toRecord(parsed);

    const managedProperties = (name: SectionName): Record<string, string> => {
      const project =
        name === "*" ? normalizeCharset(existing[name] ?? {}) : (existing[name] ?? {});

      switch (name) {
        case "*": {
          return {
            charset: CHARSET,
            end_of_line: "lf",
            indent_size: String(indentSettings.indentWidth),
            insert_final_newline: "true",
            trim_trailing_whitespace: "true",
            ...project,
          };
        }
        // Markdown keeps its trailing spaces: two of them at the end of a line are a hard line
        // break, the only way to write one, so trimming them rewrites the document rather than
        // tidying it.
        case "*.markdown":
        case "*.md": {
          return { trim_trailing_whitespace: "false", ...project };
        }
        case "DEFAULT": {
          return { root: "true" };
        }
        case "GNUmakefile":
        case "Makefile": {
          return {
            indent_size: String(indentSettings.indentWidth),
            indent_style: "tab",
            ...project,
          };
        }
      }
    };

    const seen = new Set<string>();

    // Every section the file already has, in the order it has them: managed ones refreshed, the
    // project's own passed through untouched.
    const kept: INI.SectionEntry[] = Object.entries(existing).map(([name, properties]) => {
      seen.add(name);

      return MANAGED_SECTIONS.includes(name as SectionName)
        ? { name, properties: managedProperties(name as SectionName) }
        : { name, properties };
    });

    const added: INI.SectionEntry[] = MANAGED_SECTIONS.filter((name) => !seen.has(name)).map(
      (name) => ({ name, properties: managedProperties(name) }),
    );

    return INI.stringify([...kept, ...added]);
  },
  scope: "git-root",
  tools: ["editorconfig-checker"],
};
