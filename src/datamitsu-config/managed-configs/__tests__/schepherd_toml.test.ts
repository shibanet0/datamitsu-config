import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import catalog from "../../registries/schepherdCatalog.json";
import {
  schepherdDefaultProcessorOrder,
  schepherdDefaultProcessors,
  schepherdPrepareConfig,
} from "../../schepherd-processors";
import { schepherdToml } from "../schepherd_toml";

type ParsedToml = Record<string, unknown> & { runner?: Record<string, unknown> };
const toml = createRequire(import.meta.resolve("knip"))("smol-toml") as {
  parse: (input: string) => ParsedToml;
  stringify: (input: Record<string, unknown>) => string;
};

const render = (originalContent: string): string =>
  schepherdToml.content!({ originalContent } as never)!;

const legacyRunner = `
[runner]
command = "\${JSONSCHEMA_BIN}"
args = ["validate", "--json", "--continue", "{schema}", "{files...}"]
mode = "batch"
jobs = 4
`;

const defaultProcessors = schepherdDefaultProcessors;
const defaultProcessorOrder = [...schepherdDefaultProcessorOrder];

describe("Schepherd configuration", () => {
  beforeEach(() => vi.stubGlobal("TOML", toml));
  afterEach(() => vi.unstubAllGlobals());

  it("seeds the ordered typed validator defaults and remains idempotent", () => {
    const generated = render("");
    const output = toml.parse(generated);

    expect(output.processors).toEqual(defaultProcessors);
    expect(output.runner?.processors).toEqual(defaultProcessorOrder);
    expect(render(generated)).toBe(generated);
  });

  it("serializes the same processor recipe for preparation without project mappings", () => {
    const recipe = toml.parse(toml.stringify(schepherdPrepareConfig));

    expect(recipe).toEqual({
      config_version: 1,
      processors: defaultProcessors,
      runner: { jobs: 4, processors: defaultProcessorOrder },
    });
    expect(recipe).not.toHaveProperty("mappings");
    expect(recipe).not.toHaveProperty("schemas");
  });

  it("migrates the exact legacy generated command without discarding execution settings", () => {
    const migrated = toml.parse(
      render(`${legacyRunner}
timeout = "90s"
cwd = "{workspace}"
fail_fast = true
inherit_env = false
max_args_bytes = 8192

[runner.env]
PROJECT_FLAG = "enabled"
`),
    );

    expect(migrated.processors).toEqual(defaultProcessors);
    expect(migrated.runner).toEqual({
      cwd: "{workspace}",
      env: { PROJECT_FLAG: "enabled" },
      fail_fast: true,
      inherit_env: false,
      jobs: 4,
      max_args_bytes: 8192,
      processors: defaultProcessorOrder,
      timeout: "90s",
    });
  });

  it.each([
    '[runner]\ncommand = "${JSONSCHEMA_BIN}"\n',
    '[runner]\nmode = "batch"\n',
    '[runner]\nargs = ["validate", "--json", "--continue", "{schema}", "{files...}"]\n',
  ])(
    "migrates partial legacy defaults without changing behavior on a second reconciliation",
    (original) => {
      const output = render(original);

      expect(toml.parse(output).processors).toEqual(defaultProcessors);
      expect(toml.parse(output).runner).toEqual({ jobs: 4, processors: defaultProcessorOrder });
      expect(render(output)).toBe(output);
    },
  );

  it("retains local schemas and extensionless mappings when seeding the default processor", () => {
    const original = `
[catalog]
repository = "registry.example.test/schema-mirror"

[schemas.company]
path = "schemas/company.json"

[[mappings]]
file_match = ["config/company"]
schema = "company"
`;
    const output = toml.parse(render(original));
    const project = toml.parse(original);

    expect(output.catalog).toEqual({
      digest: catalog.digest,
      repository: "registry.example.test/schema-mirror",
    });
    expect(output.schemas).toEqual(project.schemas);
    expect(output.mappings).toEqual(project.mappings);
    expect(output.processors).toEqual(defaultProcessors);
    expect(render(render(original))).toBe(render(original));
  });

  it("preserves the mirror, local schemas, mappings and explicit processor overrides and order", () => {
    const original = `
config_version = 1
workspace = "."
offline = true

[catalog]
repository = "registry.example.test/schema-mirror"
digest = "sha256:project-pin"

[runner]
jobs = 2
processors = ["strict", "native"]
timeout = "45s"
unsupported = "error"

[processors.native]
type = "sourcemeta"
command = "./tools/jsonschema"
output = "raw"
inherit_env = false

[processors.native.env]
VALIDATION_POLICY = "strict"

[processors.strict]
type = "custom"
command = "./tools/schema-check"
args = ["{schema}", "{file}"]
mode = "per-file"
formats = ["json"]

[schemas.company]
path = "schemas/company.json"
file_match = ["config/*.json"]
processor = "strict"

[[mappings]]
file_match = ["config/company.json"]
schema = "company"
processor = "native"
`;
    const expected = toml.parse(original);
    expected.catalog = {
      digest: catalog.digest,
      repository: "registry.example.test/schema-mirror",
    };

    expect(toml.parse(render(original))).toEqual(expected);
    expect(render(render(original))).toBe(render(original));
  });

  it("removes only the old managed legacy fields when a project already declares processors", () => {
    const original = `${legacyRunner}
processors = ["project"]

[processors.project]
type = "custom"
command = "./tools/schema-check"
args = ["{schema}", "{file}"]
`;
    const output = toml.parse(render(original));

    expect(output.runner).toEqual({ jobs: 4, processors: ["project"] });
    expect(output.processors).toEqual(toml.parse(original).processors);
  });

  it.each([
    '[runner]\ncommand = "./tools/jsonschema"\nargs = ["validate", "{schema}", "{files...}"]\nmode = "batch"\njobs = 2\n',
    legacyRunner.replace('"--continue", ', ""),
    legacyRunner.replace('mode = "batch"', 'mode = "per-file"'),
  ])("keeps customized legacy runners without enabling another processor", (original) => {
    const output = toml.parse(render(original));

    expect(output.runner).toEqual(toml.parse(original).runner);
    expect(output).not.toHaveProperty("processors");
    expect(render(render(original))).toBe(render(original));
  });

  it("keeps the prior legacy defaults for a partial custom runner without adding processors", () => {
    const output = toml.parse(render('[runner]\ncommand = "./tools/schema-check"\n'));

    expect(output.runner).toEqual({
      args: ["validate", "--json", "--continue", "{schema}", "{files...}"],
      command: "./tools/schema-check",
      jobs: 4,
      mode: "batch",
    });
    expect(output).not.toHaveProperty("processors");
    expect(render(render('[runner]\ncommand = "./tools/schema-check"\n'))).toBe(
      render('[runner]\ncommand = "./tools/schema-check"\n'),
    );
  });

  it("preserves declared processors without inserting native or forcing selection order", () => {
    const original = `
[processors.project]
type = "sourcemeta"
command = "./tools/jsonschema"
`;
    const output = toml.parse(render(original));

    expect(output.processors).toEqual(toml.parse(original).processors);
    expect(output.runner).toEqual({ jobs: 4 });
  });

  it.each([
    'extends = ["./base.schepherd.toml"]\n',
    'extends = ["./base.schepherd.toml"]\n[runner]\nprocessors = ["inherited"]\n',
    'extends = ["./base.schepherd.toml"]\n[runner]\nargs = ["{schema}", "{file}"]\n',
    `extends = ["./base.schepherd.toml"]\n${legacyRunner}`,
  ])("does not introduce conflicting local execution defaults over an extends base", (original) => {
    const output = toml.parse(render(original));

    expect(output).not.toHaveProperty("processors");
    expect(output.runner).toEqual({
      jobs: 4,
      ...(toml.parse(original).runner as Record<string, unknown> | undefined),
    });
    expect(render(render(original))).toBe(render(original));
  });

  it("rejects conflicting project legacy commands and processors rather than deleting either", () => {
    expect(() =>
      render(`
[runner]
command = "./tools/legacy-validator"
args = ["{schema}", "{files...}"]
mode = "batch"

[processors.project]
type = "sourcemeta"
command = "./tools/jsonschema"
`),
    ).toThrow(/runner\.(command|args|mode).*processors/);
  });
});
