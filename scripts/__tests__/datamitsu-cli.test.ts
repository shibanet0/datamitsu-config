import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { datamitsuInvocation, selectDatamitsuBin } from "../lib/datamitsu-cli.ts";

const temporaryCore = resolve(tmpdir(), "datamitsu-core");
const projectRoot = resolve(tmpdir(), "datamitsu-project");

describe("selectDatamitsuBin", () => {
  it("removes the explicit executable option and forwards remaining args", () => {
    expect(
      selectDatamitsuBin(
        ["--offline", "--datamitsu-bin", temporaryCore, "--tools", "schepherd"],
        {},
      ),
    ).toEqual({ bin: temporaryCore, passthrough: ["--offline", "--tools", "schepherd"] });
  });

  it("keeps the pinned local CLI and passthrough args by default", () => {
    expect(selectDatamitsuBin(["--offline"], {})).toEqual({
      bin: undefined,
      passthrough: ["--offline"],
    });
  });

  it("accepts the explicit environment override", () => {
    expect(selectDatamitsuBin(["--offline"], { DATAMITSU_BIN: temporaryCore })).toEqual({
      bin: temporaryCore,
      passthrough: ["--offline"],
    });
  });

  it("requires an absolute executable path", () => {
    expect(() => selectDatamitsuBin(["--datamitsu-bin", "datamitsu"], {})).toThrow(
      "DATAMITSU_BIN must be an absolute executable path",
    );
  });
});

describe("datamitsuInvocation", () => {
  it("injects the base config for an explicit core", () => {
    expect(
      datamitsuInvocation(["source", "status"], { DATAMITSU_BIN: temporaryCore }, projectRoot),
    ).toEqual({
      args: [
        "--before-config",
        resolve(projectRoot, "datamitsu.config.base.js"),
        "source",
        "status",
      ],
      command: temporaryCore,
    });
  });

  it("uses the normal wrapper which injects its own base config by default", () => {
    expect(datamitsuInvocation(["source", "status"], {}, projectRoot)).toEqual({
      args: ["source", "status"],
      command: resolve(projectRoot, "bin/datamitsu.js"),
    });
  });
});
