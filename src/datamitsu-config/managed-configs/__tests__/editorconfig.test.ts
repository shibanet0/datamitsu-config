import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { editorconfig } from "../_editorconfig";
import { indentSettings } from "../../constants";

interface Section {
  name: string;
  properties: Record<string, string>;
}

/**
 * The `INI` helper the goja runtime injects, in the smallest form this generator uses. `DEFAULT` is
 * its name for the properties above the first section header, which is where `root = true` lives.
 */
const ini = {
  parse: (text: string): Section[] => {
    const sections: Section[] = [{ name: "DEFAULT", properties: {} }];

    for (const line of text.split("\n")) {
      const header = /^\s*\[(?<name>.+)]\s*$/.exec(line);

      if (header?.groups?.["name"]) {
        sections.push({ name: header.groups["name"], properties: {} });
        continue;
      }

      const pair = /^\s*(?<key>[^=#;]+?)\s*=\s*(?<value>.*?)\s*$/.exec(line);

      if (pair?.groups?.["key"]) {
        sections.at(-1)!.properties[pair.groups["key"]] = pair.groups["value"] ?? "";
      }
    }

    return sections.filter(
      (section) => section.name !== "DEFAULT" || Object.keys(section.properties).length > 0,
    );
  },
  stringify: (sections: Section[]): string =>
    sections
      .map((section) => {
        const body = Object.entries(section.properties)
          .map(([key, value]) => `${key} = ${value}`)
          .join("\n");

        return section.name === "DEFAULT" ? `${body}\n` : `[${section.name}]\n${body}\n`;
      })
      .join("\n"),
  toRecord: (sections: Section[]): Record<string, Record<string, string>> =>
    Object.fromEntries(sections.map((section) => [section.name, section.properties])),
};

const render = (originalContent: string): string =>
  editorconfig.content!({ originalContent } as never)!;

describe("editorconfig", () => {
  beforeEach(() => vi.stubGlobal("INI", ini));
  afterEach(() => vi.unstubAllGlobals());

  it("writes the charset the specification defines", () => {
    expect(render("")).toContain("charset = utf-8");
  });

  it("keeps markdown's trailing spaces, which are hard line breaks", () => {
    expect(render("")).toContain("[*.md]\ntrim_trailing_whitespace = false");
  });

  /**
   * EditorConfig applies every matching section in file order and the last one wins, so moving the
   * project's sections below the managed ones reversed a deliberate narrowing — `[*.md]` written
   * after `[*.{md,markdown}]` stopped taking effect, and Markdown went back to having its hard line
   * breaks trimmed.
   */
  it("leaves the project's sections where the project put them", () => {
    const source = [
      "[*.{md,markdown}]",
      "trim_trailing_whitespace = true",
      "",
      "[*.md]",
      "trim_trailing_whitespace = false",
      "",
    ].join("\n");

    const rendered = render(source);

    expect(rendered.indexOf("[*.{md,markdown}]")).toBeLessThan(rendered.indexOf("[*.md]"));
  });

  it("replaces the invalid charset an earlier version wrote", () => {
    expect(render("[*]\ncharset = utf8\n")).toContain("charset = utf-8");
  });

  it("keeps a section it does not own", () => {
    expect(render("[*.go]\nindent_style = tab\n")).toContain("[*.go]");
  });

  it("gives Kotlin the shared formatter settings without enabling a second layout checker", () => {
    const sections = ini.toRecord(ini.parse(render("")));
    expect(sections["*.{kt,kts}"]).toMatchObject({
      ij_continuation_indent_size: String(indentSettings.indentWidth),
      indent_size: String(indentSettings.indentWidth),
      ktlint_standard: "disabled",
      "ktlint_standard_class-naming": "enabled",
      "ktlint_standard_no-wildcard-imports": "enabled",
      max_line_length: String(indentSettings.lineWidth),
    });
  });

  it("preserves Kotlin overrides and their precedence across regeneration", () => {
    const source = [
      "[*.{kt,kts}]",
      "indent_size = 4",
      "ktlint_standard_no-wildcard-imports = disabled",
      "",
      "[*.kt]",
      "max_line_length = 120",
    ].join("\n");
    const rendered = render(source);
    const sections = ini.toRecord(ini.parse(rendered));
    expect(sections["*.{kt,kts}"]?.["indent_size"]).toBe("4");
    expect(sections["*.{kt,kts}"]?.["ktlint_standard_no-wildcard-imports"]).toBe("disabled");
    expect(rendered.indexOf("[*.{kt,kts}]")).toBeLessThan(rendered.indexOf("[*.kt]"));
    expect(render(rendered)).toBe(rendered);
  });

  it("inserts new Kotlin defaults before an existing project-specific section", () => {
    const rendered = render(
      "root = true\n[*]\nindent_size = 2\n[*.kt]\nindent_size = 4\nmax_line_length = 120\n",
    );
    expect(rendered.indexOf("[*.{kt,kts}]")).toBeLessThan(rendered.indexOf("[*.kt]"));
    expect(ini.toRecord(ini.parse(rendered))["*.kt"]).toMatchObject({
      indent_size: "4",
      max_line_length: "120",
    });
    expect(render(rendered)).toBe(rendered);
  });

  it("is idempotent", () => {
    const once = render("");

    expect(render(once)).toBe(once);
  });
});
