import { describe, expect, it } from "vitest";

import { sortProperties } from "../properties";
import { sortYaml } from "../yaml";

describe("sortYaml", () => {
  it("orders mapping keys alphabetically", () => {
    expect(sortYaml("b: 2\na: 1\n")).toBe("a: 1\nb: 2\n");
  });

  it("keeps comments with the key they sit on", () => {
    const sorted = sortYaml("# about b\nb: 2\n# about a\na: 1\n");

    expect(sorted).toBe("# about a\na: 1\n# about b\nb: 2\n");
  });

  it("sorts nested mappings too", () => {
    expect(sortYaml("outer:\n  z: 1\n  y: 2\n")).toBe("outer:\n  y: 2\n  z: 1\n");
  });

  it("leaves sequences in their order", () => {
    expect(sortYaml("steps:\n  - second\n  - first\n")).toBe("steps:\n  - second\n  - first\n");
  });

  /**
   * The defect this tool exists for: `yq 'sort_keys(..)'` moved the alias above the anchor that
   * defines it, and `yamllint` then reported `found undeclared alias "a"` on a file `dm fix` had
   * just written. A document with anchors keeps its author's order instead.
   */
  it("leaves a document with an anchor untouched", () => {
    const source = "z: &a\n  key: value\nb: *a\n";

    expect(sortYaml(source)).toBe(source);
  });

  it("leaves a document with a merge key untouched", () => {
    const source = "base: &base\n  a: 1\nchild:\n  <<: *base\n  b: 2\n";

    expect(sortYaml(source)).toBe(source);
  });

  /**
   * Found in review: a merge of an inline map carries no alias, so the earlier guard — which looked
   * only for anchors and aliases — reordered a document whose merge position decides what its keys
   * resolve to.
   */
  it("leaves a merge key with no alias untouched", () => {
    const source = "z: 1\n<<: {b: 2}\na: 3\n";

    expect(sortYaml(source)).toBe(source);
  });

  it("leaves an unparsable document untouched", () => {
    const source = "a: [1, 2\n";

    expect(sortYaml(source)).toBe(source);
  });

  it("returns the original bytes when already sorted", () => {
    const source = "a: 1\nb: 2\n";

    expect(sortYaml(source)).toBe(source);
  });

  it("sorts each document of a multi-document file", () => {
    expect(sortYaml("b: 2\na: 1\n---\nd: 4\nc: 3\n")).toBe("a: 1\nb: 2\n---\nc: 3\nd: 4\n");
  });

  /**
   * An anchor on the key side is still an anchor, and still orders the document.
   */
  it("leaves a document with an anchor on a key untouched", () => {
    const source = "b: 2\n&k a: 1\n";

    expect(sortYaml(source)).toBe(source);
  });

  it("keeps a block scalar intact", () => {
    expect(sortYaml("b: |\n  line one\n  line two\na: 1\n")).toBe(
      "a: 1\nb: |\n  line one\n  line two\n",
    );
  });

  /**
   * Found in review: without `intAsBigInt`, an integer past 2^53 is parsed into a JS number and
   * written back rounded — `9007199254740993` became `…992` on a file the sorter only claimed to
   * reorder.
   */
  it("keeps an integer larger than 2^53 exact", () => {
    expect(sortYaml("b: 9007199254740993\na: 0\n")).toBe("a: 0\nb: 9007199254740993\n");
  });

  it("leaves a file of nothing but comments untouched", () => {
    const source = "# nothing here\n";

    expect(sortYaml(source)).toBe(source);
  });
});

describe("sortProperties", () => {
  it("orders keys alphabetically", () => {
    expect(sortProperties("b=2\na=1\n")).toBe("a=1\nb=2\n");
  });

  /**
   * The defect this replaces: the old sorter round-tripped through YAML, which reads `a.b` as `b`
   * nested under `a`, so this file came back as `a = world` alone — `a.b=hello` was gone.
   */
  it("keeps a key that is a prefix of another key", () => {
    const sorted = sortProperties("a.b=hello\na=world\n");

    expect(sorted).toContain("a.b=hello");
    expect(sorted).toContain("a=world");
    expect(sorted.trim().split("\n")).toHaveLength(2);
  });

  it("keeps a comment with the key below it", () => {
    expect(sortProperties("# about b\nb=2\n# about a\na=1\n")).toBe(
      "# about a\na=1\n# about b\nb=2\n",
    );
  });

  it("keeps a continued value with its key", () => {
    const source = "b=two\na=one \\\n  and more\n";

    expect(sortProperties(source)).toBe("a=one \\\n  and more\nb=two\n");
  });

  it("keeps duplicate keys, both of them", () => {
    const sorted = sortProperties("b=2\na=1\na=3\n");

    expect(sorted.trim().split("\n")).toHaveLength(3);
    expect(sorted).toContain("a=1");
    expect(sorted).toContain("a=3");
  });

  it("reads a colon or a space as the separator", () => {
    expect(sortProperties("b:2\na 1\n")).toBe("a 1\nb:2\n");
  });

  it("leaves trailing comments at the end", () => {
    expect(sortProperties("b=2\na=1\n\n# the end\n")).toBe("a=1\nb=2\n\n# the end\n");
  });

  it("returns the original bytes when already sorted", () => {
    const source = "a=1\nb=2\n";

    expect(sortProperties(source)).toBe(source);
  });

  it("keeps CRLF line endings", () => {
    expect(sortProperties("b=2\r\na=1\r\n")).toBe("a=1\r\nb=2\r\n");
  });

  /**
   * `\=` is part of the key, not the separator — the key here is `a=x`.
   */
  it("reads an escaped separator as part of the key", () => {
    expect(sortProperties("b=2\na\\=x=1\n")).toBe("a\\=x=1\nb=2\n");
  });

  it("treats a bang line as a comment", () => {
    expect(sortProperties("! about b\nb=2\n! about a\na=1\n")).toBe(
      "! about a\na=1\n! about b\nb=2\n",
    );
  });

  /**
   * Found in review: the file is split on `\n`, so in a CRLF file the backslash is never the last
   * character and a continued value read as two records — sorting then moved `b=2` into the middle
   * of `a`'s value.
   */
  it("keeps a CRLF continuation with its key", () => {
    expect(sortProperties("a=one \\\r\n  zzz\r\nb=2\r\n")).toBe("a=one \\\r\n  zzz\r\nb=2\r\n");
  });

  /**
   * Found in review: a file ending mid-value has nothing to sort safely — moving the truncated
   * record earlier swallowed the next key into its value.
   */
  it("leaves a file that ends mid-continuation untouched", () => {
    const source = "z=first\na=last\\";

    expect(sortProperties(source)).toBe(source);
  });

  /**
   * Found in review: `a\\` is an escaped backslash, so the `=` after it is the separator and the
   * key is `a\`. Reading the pair as an escaped `=` made both lines one key and swapped them, which
   * changes the value a reader ends up with — properties is last-wins.
   */
  it("reads an escaped backslash as part of the key, not as an escaped separator", () => {
    const source = "a\\\\=z\na\\\\=a\n";

    expect(sortProperties(source)).toBe(source);
  });

  /**
   * Found in review: `\u0061` and `a` are the same key, so they have to sort together — otherwise
   * the last-wins order changes and with it the value.
   */
  it("decodes a unicode escape in a key", () => {
    const source = "\\u0061=old\na=new\n";

    expect(sortProperties(source)).toBe(source);
  });

  it("does not add a trailing newline to a file without one", () => {
    expect(sortProperties("b=2\na=1")).toBe("a=1\nb=2");
  });
});
