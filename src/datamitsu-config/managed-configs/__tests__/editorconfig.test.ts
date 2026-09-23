import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { editorconfig } from "../_editorconfig";

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

  it("is idempotent", () => {
    const once = render("");

    expect(render(once)).toBe(once);
  });
});
