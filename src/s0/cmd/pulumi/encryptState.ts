import crypto, { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path, { join } from "node:path";
import util from "node:util";

import { Datamitsu } from "../../../lib";
import { isExecaError } from "../../../utils/typeGuards";
import { Encryptor } from "../../utils/encryption";
import { getGPGTTY } from "../../utils/tty";
import {
  DEFAULT_CONCURRENCY_LIMIT,
  detectFileType,
  getEncryptedPath,
  PULUMI_ENCRYPTED_EXCLUDE_PATTERNS,
  PULUMI_STATE_PATTERNS,
} from "./constants";
import { stripInsignificantJsonWhitespace } from "./stateContent";
import { findStateFiles } from "./stateFiles";

export const getEditorJS = async (buf: Buffer) => {
  const encryptor = new Encryptor(crypto, util);
  const encryptionKey = encryptor.generateKey();
  const encryptionKeyName = randomUUID();

  const encryptedContentBuf = await encryptor.encrypt(buf, encryptionKey);

  // The editor runs as a standalone script built with String(), so everything it uses is passed in
  // as arguments: identifiers of this module may be renamed by the bundler or the test transform.
  // oxlint-disable-next-line consistent-function-scoping
  const editor = async (
    contentEncryptedBase64: string,
    encryptionKeyBase64: string,
    EncryptorClass: typeof Encryptor,
    stripWhitespace: typeof stripInsignificantJsonWhitespace,
  ) => {
    const [fsInner, cryptoInner, utilInner] = await Promise.all([
      import("node:fs/promises"),
      import("node:crypto"),
      import("node:util"),
    ]);

    const contentEncryptedBuffer = Buffer.from(contentEncryptedBase64, "base64");
    const decryptionKey = Buffer.from(encryptionKeyBase64, "base64");

    const innerEncryptor = new EncryptorClass(cryptoInner, utilInner);

    const contentBuf = await innerEncryptor.decrypt(contentEncryptedBuffer, decryptionKey);

    const filePath = process.argv.at(2);

    if (!filePath) {
      console.error("The file path is not specified");
      process.exit(1);
    }

    const isJSON = filePath.endsWith(".json") || filePath.endsWith(".json.enc");
    const currentBuf = await fsInner.readFile(filePath);

    const isUnchanged = isJSON
      ? stripWhitespace(contentBuf.toString("utf8")) ===
        stripWhitespace(currentBuf.toString("utf8"))
      : contentBuf.equals(currentBuf);

    if (isUnchanged) {
      console.log("File has not changed");
      process.exit(0);
    }

    try {
      await fsInner.writeFile(filePath, contentBuf);
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  };

  return {
    env: { [encryptionKeyName]: encryptionKey.toString("base64") },
    scriptContent: [
      "#!/usr/bin/env node",
      `const encryptionKey = process.env[${JSON.stringify(encryptionKeyName)}];`,
      `const Encryptor = ${String(Encryptor)};`,
      `const stripInsignificantJsonWhitespace = ${String(stripInsignificantJsonWhitespace)};`,
      `const editor = ${String(editor)};`,
      `const content = ${JSON.stringify(encryptedContentBuf.toString("base64"))};`,
      "await editor(content, encryptionKey, Encryptor, stripInsignificantJsonWhitespace);",
      "",
    ].join("\n"),
  };
};

async function processFile(file: string, datamitsu: Datamitsu, GPG_TTY: string): Promise<void> {
  const fileType = detectFileType(file);
  const relativePath = path.relative(process.cwd(), file);

  console.log(`📄 Processing: ${relativePath}`);

  const data = await fs.readFile(file, "base64");
  const dir = join(os.tmpdir(), "pulumi-sops", crypto.randomUUID());

  const editor = join(dir, "editor.mjs");

  await fs.mkdir(dir, { mode: 0o700, recursive: true });

  try {
    const editorJS = await getEditorJS(Buffer.from(data, "base64"));
    await fs.writeFile(editor, editorJS.scriptContent, { mode: 0o700 });

    await datamitsu.exec(
      "sops",
      [
        "--input-type",
        fileType,
        "--output-type",
        fileType,
        getEncryptedPath(path.relative(process.cwd(), file)),
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ...editorJS.env,
          EDITOR: editor,
          GPG_TTY,
          // SOPS prefers SOPS_EDITOR over EDITOR; an inherited one would bypass the generated editor.
          SOPS_EDITOR: editor,
        },
      },
    );

    console.log(`   ✅ Encrypted: ${relativePath}.enc\n`);
  } catch (error: unknown) {
    const isSopsFileUnchanged =
      isExecaError(error) &&
      error.exitCode === 1 &&
      error.stderr?.includes("exit status 200") &&
      error.stdout?.includes("File has not changed");

    if (isSopsFileUnchanged) {
      console.log(`   ⏭️  Skipped: ${relativePath} (no changes)\n`);
    } else {
      throw error;
    }
  } finally {
    try {
      await fs.rm(dir, { recursive: true });
    } catch {
      // Ignore cleanup errors to avoid masking the original error
    }
  }
}

export const pulumiEncrypt = async () => {
  const files = await findStateFiles(PULUMI_STATE_PATTERNS, PULUMI_ENCRYPTED_EXCLUDE_PATTERNS);

  console.log(`\n🔐 Found ${files.length} Pulumi state file(s) to encrypt:\n`);

  const datamitsu = new Datamitsu();
  const GPG_TTY = await getGPGTTY();

  // Process in batches of 5
  const batchSize = DEFAULT_CONCURRENCY_LIMIT;
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    // oxlint-disable-next-line no-await-in-loop
    const results = await Promise.allSettled(
      batch.map((file) => processFile(file, datamitsu, GPG_TTY)),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        const error = result.reason;
        console.error(`\n❌ Error during encryption:`, error);
        errors++;
      }
      processed++;
    }
  }

  console.log(`\n✨ Encryption complete! (${processed - errors}/${processed} succeeded)\n`);

  if (errors > 0) {
    process.exit(1);
  }
};
