import { describe, expect, it } from "vitest";

import { isSameStateContent, stripInsignificantJsonWhitespace } from "../stateContent.js";

describe("stripInsignificantJsonWhitespace", () => {
  it("should remove indentation and newlines outside strings", () => {
    expect(stripInsignificantJsonWhitespace('{\n    "a": [ 1, 2 ]\n}\n')).toBe('{"a":[1,2]}');
  });

  it("should keep whitespace and escaped quotes inside strings", () => {
    expect(stripInsignificantJsonWhitespace('{ "a b": "c \\" d\\\\" }')).toBe(
      '{"a b":"c \\" d\\\\"}',
    );
  });

  it("should keep number literals exactly", () => {
    expect(stripInsignificantJsonWhitespace('{ "n": 12345678901234567890 }')).toBe(
      '{"n":12345678901234567890}',
    );
  });
});

describe("isSameStateContent", () => {
  it("should treat JSON that differs only in formatting as the same", () => {
    expect(isSameStateContent('{"a":[1,2]}', '{\n  "a": [\n    1,\n    2\n  ]\n}\n', "json")).toBe(
      true,
    );
  });

  it("should treat a reordered array as different", () => {
    expect(
      isSameStateContent(
        '{"resources":[{"urn":"a"},{"urn":"b"}]}',
        '{"resources":[{"urn":"b"},{"urn":"a"}]}',
        "json",
      ),
    ).toBe(false);
  });

  it("should treat integers beyond 2^53 that differ as different", () => {
    expect(isSameStateContent('{"n":9007199254740993}', '{"n":9007199254740992}', "json")).toBe(
      false,
    );
  });

  it("should compare YAML structurally", () => {
    expect(isSameStateContent("version: 1\n", "version:   1", "yaml")).toBe(true);
    expect(isSameStateContent("version: 1\n", "version: 2\n", "yaml")).toBe(false);
  });

  it("should fall back to text comparison for unparsable YAML", () => {
    expect(isSameStateContent("a: [", "a: [", "yaml")).toBe(true);
    expect(isSameStateContent("a: [", "a:  [", "yaml")).toBe(false);
  });

  it("should accept buffers", () => {
    expect(isSameStateContent(Buffer.from("{}"), "{ }", "json")).toBe(true);
  });
});
