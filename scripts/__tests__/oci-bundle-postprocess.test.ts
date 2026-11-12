import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { zstdCompressSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { resolveSubtree } from "../oci-bundle-postprocess.ts";

function registryFor(entries: string[]) {
  const tar = Buffer.concat([...entries.map(tarEntry), Buffer.alloc(1024)]);
  const blob = zstdCompressSync(tar);
  return {
    layer: {
      digest: `sha256:${createHash("sha256").update(blob).digest("hex")}`,
      mediaType: "application/vnd.oci.image.layer.v1.tar+zstd",
      size: blob.length,
    },
    registry: {
      blobStream: async () => ({
        abort: () => {},
        stream: Readable.from([blob], { objectMode: false }),
      }),
    },
  };
}

function tarEntry(name: string): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");
  header.write("0000644\0", 100, 8, "ascii");
  header.write("0000000\0", 108, 8, "ascii");
  header.write("0000000\0", 116, 8, "ascii");
  header.write("00000000000\0", 124, 12, "ascii");
  header.write("00000000000\0", 136, 12, "ascii");
  header.fill(0x20, 148, 156);
  header.write(name.endsWith("/") ? "5" : "0", 156, 1, "ascii");
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");
  let checksum = 0;
  for (const byte of header) checksum += byte;
  header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
  return header;
}

const identity = "95901c035a86383473f5f2b99aef893e";

describe("OCI bundle subtree resolution", () => {
  it("resolves the exact Python leaf beneath a hashless runtime COPY root", async () => {
    const { layer, registry } = registryFor([
      "dm/",
      "dm/store/",
      "dm/store/.runtime-data/",
      "dm/store/.runtime-data/uv/",
      `dm/store/.runtime-data/uv/${identity}/`,
      `dm/store/.runtime-data/uv/${identity}/uv-cache/`,
      `dm/store/.runtime-data/uv/${identity}/uv-cache/file`,
      `dm/store/.runtime-data/uv/${identity}/python/`,
      `dm/store/.runtime-data/uv/${identity}/python/bin/python`,
    ]);
    expect(
      await resolveSubtree(
        registry,
        layer,
        { kind: "python-data", subtree: ".runtime-data/uv" },
        "dm/store",
      ),
    ).toBe(`.runtime-data/uv/${identity}/python`);
  });

  it("rejects cache and similar names when no Python payload exists", async () => {
    const { layer, registry } = registryFor([
      `dm/store/.runtime-data/uv/${identity}/uv-cache/file`,
      `dm/store/.runtime-data/uv/${identity}/python-data/file`,
    ]);
    expect(
      await resolveSubtree(
        registry,
        layer,
        { kind: "python-data", subtree: ".runtime-data/uv" },
        "dm/store",
      ),
    ).toBeUndefined();
  });

  it.each([
    { kind: "runtime" as const, subtree: ".runtimes/uv" },
    { kind: "app" as const, subtree: ".apps/uv/httpstat" },
  ])("preserves hash-level $kind ownership", async (entry) => {
    const { layer, registry } = registryFor([
      `dm/store/${entry.subtree}/`,
      `dm/store/${entry.subtree}/${identity}/`,
      `dm/store/${entry.subtree}/${identity}/executable`,
    ]);
    expect(await resolveSubtree(registry, layer, entry, "dm/store")).toBe(
      `${entry.subtree}/${identity}`,
    );
  });
});
