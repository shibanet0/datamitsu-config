import { describe, expect, it } from "vitest";

import { selectPythonDownloads, type UpstreamPythonDownload } from "../lib/python-downloads";

const validEntry = (overrides: UpstreamPythonDownload = {}): UpstreamPythonDownload => ({
  arch: { family: "x86_64", variant: null },
  build: "20261013",
  libc: "gnu",
  major: 3,
  minor: 14,
  name: "cpython",
  os: "linux",
  patch: 8,
  prerelease: "",
  sha256: "a".repeat(64),
  url: "https://example.invalid/python.tar.gz",
  variant: null,
  ...overrides,
});

describe("selectPythonDownloads", () => {
  it("rejects a selected entry without a SHA-256", () => {
    expect(() =>
      selectPythonDownloads(
        { "cpython-3.14.8-linux-x86_64-gnu": validEntry({ sha256: undefined }) },
        "3.14.8",
      ),
    ).toThrow("Missing or invalid SHA-256");
  });

  it("excludes non-default variants", () => {
    const selected = selectPythonDownloads(
      {
        archVariant: validEntry({ arch: { family: "x86_64", variant: "v3" } }),
        default: validEntry(),
        freeThreaded: validEntry({ variant: "freethreaded" }),
      },
      "3.14.8",
    );
    expect(Object.keys(selected)).toEqual(["default"]);
  });

  it("normalizes null optional variants to empty strings", () => {
    const selected = selectPythonDownloads({ cpython: validEntry() }, "3.14.8").cpython!;
    expect(selected.variant).toBe("");
    expect(selected.arch.variant).toBe("");
  });

  it("selects only the exact requested Python version", () => {
    const selected = selectPythonDownloads(
      {
        exact: validEntry(),
        minorMismatch: validEntry({ minor: 15 }),
        patchMismatch: validEntry({ patch: 9 }),
      },
      "3.14.8",
    );
    expect(Object.keys(selected)).toEqual(["exact"]);
  });
});
