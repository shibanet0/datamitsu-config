import { describe, expect, it } from "vitest";

import { extractManifest } from "../export-inspector.ts";

const element = (body: string): string =>
  `<script type="application/json" id="inspector-manifest">${body}</script>`;

describe("extractManifest", () => {
  it("returns the embedded manifest verbatim", () => {
    const body = '{"schemaVersion":2,"name":"x","apps":[{"runtime":"node"}],"tools":[]}';
    const html = `<html><head>${element(body)}<script>app()</script></head></html>`;
    expect(extractManifest(html)).toBe(body);
  });

  it("keeps Go's HTML escaping, which is still valid JSON", () => {
    const body = String.raw`{"schemaVersion":2,"apps":[{"description":"\u003c/script\u003e"}]}`;
    expect(extractManifest(element(body))).toBe(body);
  });

  it("refuses an atlas without the element", () => {
    expect(() => extractManifest("<html></html>")).toThrow(/found 0/);
  });

  it("refuses an atlas with two elements", () => {
    const body = '{"schemaVersion":2,"apps":[]}';
    expect(() => extractManifest(element(body) + element(body))).toThrow(/found 2/);
  });

  it("refuses JSON that is not an inspector manifest", () => {
    expect(() => extractManifest(element('{"apps":{}}'))).toThrow(/not a datamitsu inspector/);
  });
});
