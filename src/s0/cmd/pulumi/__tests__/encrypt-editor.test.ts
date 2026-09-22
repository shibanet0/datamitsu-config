import { execa } from "execa";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getEditorJS } from "../encrypt-state.js";

/**
 * Runs the generated SOPS editor the way SOPS does: with the decrypted temporary file as its only
 * argument, reporting exit code and the file content it leaves behind.
 */
async function runEditor(root: string, plaintext: string, sopsTemporaryContent: string) {
  const editorJS = await getEditorJS(Buffer.from(plaintext));
  const editor = path.join(root, "editor.mjs");
  const sopsTemporaryFile = path.join(root, "local.json.enc");

  await fs.writeFile(editor, editorJS.scriptContent);
  await fs.writeFile(sopsTemporaryFile, sopsTemporaryContent);

  const result = await execa(process.execPath, [editor, sopsTemporaryFile], {
    env: { ...process.env, ...editorJS.env },
    reject: false,
  });

  return {
    content: await fs.readFile(sopsTemporaryFile, "utf8"),
    exitCode: result.exitCode,
    stdout: result.stdout,
  };
}

const checkpointWithResources = (first: string, second: string) =>
  JSON.stringify({ checkpoint: { latest: { resources: [{ urn: first }, { urn: second }] } } });

describe("encrypt editor script", () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pulumi-sops-editor-"));
  });

  afterEach(async () => {
    await fs.rm(root, { force: true, recursive: true });
  });

  it("should write the state verbatim, keeping dependency order", async () => {
    const plaintext = `${JSON.stringify(
      {
        checkpoint: {
          latest: {
            resources: [
              { urn: "urn:pulumi:local::p::pulumi:pulumi:Stack::p-local" },
              { urn: "urn:pulumi:local::p::z:index:Dependency::z" },
              {
                dependencies: ["urn:pulumi:local::p::z:index:Dependency::z"],
                urn: "urn:pulumi:local::p::a:index:Dependent::a",
              },
            ],
          },
        },
      },
      null,
      4,
    )}\n`;

    const result = await runEditor(root, plaintext, "{}");

    expect(result.exitCode).toBe(0);
    expect(result.content).toBe(plaintext);
  });

  it("should keep integers beyond 2^53 exactly", async () => {
    const plaintext = '{"n": 12345678901234567890}';

    const result = await runEditor(root, plaintext, '{"n": 1}');

    expect(result.content).toBe(plaintext);
  });

  it("should leave the file untouched when only formatting differs", async () => {
    const sopsTemporaryContent = '{\n  "resources": [\n    "a",\n    "b"\n  ]\n}';

    const result = await runEditor(root, '{"resources": ["a", "b"]}', sopsTemporaryContent);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File has not changed");
    expect(result.content).toBe(sopsTemporaryContent);
  });

  it("should rewrite an encrypted file whose only difference is resource order", async () => {
    const plaintext = checkpointWithResources(
      "urn:pulumi:local::p::z:index:Dependency::z",
      "urn:pulumi:local::p::a:index:Dependent::a",
    );

    const result = await runEditor(
      root,
      plaintext,
      checkpointWithResources(
        "urn:pulumi:local::p::a:index:Dependent::a",
        "urn:pulumi:local::p::z:index:Dependency::z",
      ),
    );

    expect(result.stdout).not.toContain("File has not changed");
    expect(result.content).toBe(plaintext);
  });
});
