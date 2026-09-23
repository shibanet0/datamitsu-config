import { describe, expect, it } from "vitest";

import { typosToml } from "../_typos_toml";
import { vscodeSettingsJson } from "../_vscode_settings_json";

const render = (originalContent: string): string =>
  typosToml.content!({ originalContent } as never)!;

describe("typos configuration", () => {
  it("seeds an empty project with the word list shape", () => {
    expect(render("")).toContain("[default.extend-words]");
  });

  /**
   * The package writes a file-nesting map into `.vscode/settings.json` that lists LaTeX auxiliary
   * extensions, and `.acn` and `.ist` read as misspellings of `can` and `is`. A fresh project
   * therefore failed `dm check` on a file datamitsu had just generated for it — caught by the
   * fresh-init smoke test, which is the only place a brand-new consumer is simulated.
   *
   * So the vocabulary the package's own output needs ships with the package, the way cspell's
   * dictionary does.
   */
  it("allows the words the generated VS Code settings contain", () => {
    const seeded = render("");
    const settings = vscodeSettingsJson.content!({ originalContent: "" } as never)!;

    for (const word of ["acn", "ist"]) {
      expect(settings).toContain(`.${word}`);
      expect(seeded).toContain(`${word} = "${word}"`);
    }
  });

  it("never rewrites what a project put there", () => {
    const existing = '[default.extend-words]\nfoo = "foo"\n';

    expect(render(existing)).toBe(existing);
  });
});
