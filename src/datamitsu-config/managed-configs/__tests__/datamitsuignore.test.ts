import { describe, expect, it } from "vitest";

import { datamitsuignore } from "../_datamitsuignore";

const render = (originalContent: string) => datamitsuignore.content!({ originalContent } as never)!;
const rule = "templates/**: sort-keys-yaml, yamlfmt, yamllint";

describe("chart-owned datamitsuignore", () => {
  it("preserves comments, unrelated rules and blank lines byte for byte", () => {
    const original =
      "# Project policy\nvendor/**: *\n\n# Keep custom YAML exceptions\nvalues.yaml: yamllint\n";
    expect(render(original)).toBe(`${original}${rule}\n`);
  });

  it("inserts a separator without changing an unterminated last line", () => {
    const original = "# Project policy\nvalues.yaml: yamllint";
    expect(render(original)).toBe(`${original}\n${rule}\n`);
  });

  it("preserves CRLF when appending to a terminated file", () => {
    const original = "# Project policy\r\nvendor/**: *\r\n";
    expect(render(original)).toBe(`${original}${rule}\r\n`);
  });

  it("preserves CRLF when inserting a missing final newline", () => {
    const original = "# Project policy\r\nvalues.yaml: yamllint";
    expect(render(original)).toBe(`${original}\r\n${rule}\r\n`);
  });

  it.each(["\n", "\r\n"])("is idempotent with %j line endings", (newline) => {
    const first = render(`# Project policy${newline}vendor/**: *${newline}`);
    expect(render(first)).toBe(first);
  });

  it.each([
    rule,
    `# Project policy\n${rule}\n`,
    "  templates/** : yamllint,sort-keys-yaml, yamlfmt # Keep templates out of YAML parsers\r\n",
    `vendor/**: *\r\n${rule}`,
  ])("preserves an existing equal rule without duplicating or normalizing it", (original) => {
    expect(render(original)).toBe(original);
  });

  it("does not mistake a comment or a partial rule for an equal rule", () => {
    const original = `# ${rule}\ntemplates/**: yamllint\n`;
    expect(render(original)).toBe(`${original}${rule}\n`);
    expect(render(render(original))).toBe(render(original));
  });

  it("leaves unrelated tools and paths intact", () => {
    const original =
      "templates/**: cspell\nother/templates/**: yamlfmt, yamllint, sort-keys-yaml\n";
    expect(render(original)).toBe(`${original}${rule}\n`);
  });
});
