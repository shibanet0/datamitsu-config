import fastGlob from "fast-glob";
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

const getEditorJS = async (buf: Buffer) => {
  const encryptor = new Encryptor(crypto, util);
  const encryptionKey = encryptor.generateKey();
  const encryptionKeyName = randomUUID();

  const encryptedContentBuf = await encryptor.encrypt(buf, encryptionKey);

  // oxlint-disable-next-line consistent-function-scoping
  const editor = async (contentEncryptedBase64: string, encryptionKeyBase64: string) => {
    const [fsInner, cryptoInner, utilInner] = await Promise.all([
      import("node:fs/promises"),
      import("node:crypto"),
      import("node:util"),
    ]);

    const contentEncryptedBuffer = Buffer.from(contentEncryptedBase64, "base64");
    const decryptionKey = Buffer.from(encryptionKeyBase64, "base64");

    const innerEncryptor = new Encryptor(cryptoInner, utilInner);

    const contentBuf = await innerEncryptor.decrypt(contentEncryptedBuffer, decryptionKey);

    // oxlint-disable-next-line consistent-function-scoping
    const normalizeAndSortJSON = (inputBuf: Buffer): Buffer => {
      try {
        const str = inputBuf.toString("utf8");
        const state = JSON.parse(str);

        if (Array.isArray(state?.checkpoint?.latest?.resources)) {
          state.checkpoint.latest.resources.sort((a: { urn: string }, b: { urn: string }) => {
            const urnA = a?.urn || "";
            const urnB = b?.urn || "";

            // Stack must go first (it's the root parent)
            const aIsStack = urnA.includes("::pulumi:pulumi:Stack::");
            const bIsStack = urnB.includes("::pulumi:pulumi:Stack::");

            if (aIsStack && !bIsStack) {
              return -1;
            }
            if (!aIsStack && bIsStack) {
              return 1;
            }

            // Then providers
            const aIsProvider = urnA.includes("::pulumi:providers:");
            const bIsProvider = urnB.includes("::pulumi:providers:");

            if (aIsProvider && !bIsProvider) {
              return -1;
            }
            if (!aIsProvider && bIsProvider) {
              return 1;
            }

            // Within groups - by URN
            return urnA.localeCompare(urnB);
          });
        }

        return Buffer.from(JSON.stringify(state, null, 4));
      } catch {
        return inputBuf;
      }
    };

    const filePath = process.argv.at(2);

    if (!filePath) {
      console.error("The file path is not specified");
      process.exit(1);
    }

    const isJSON = filePath.endsWith(".json") || filePath.endsWith(".json.enc");

    // Normalize both buffers the same way before comparing
    const normalizedContentBuf = isJSON ? normalizeAndSortJSON(contentBuf) : contentBuf;
    const unencryptedHash = cryptoInner
      .createHash("sha512")
      .update(normalizedContentBuf)
      .digest("hex");

    const sopsEncryptedDataBase64 = await fsInner.readFile(filePath, "base64");
    const sopsEncryptedBuf = Buffer.from(sopsEncryptedDataBase64, "base64");
    const normalizedSopsEncryptedBuf = isJSON
      ? normalizeAndSortJSON(sopsEncryptedBuf)
      : sopsEncryptedBuf;
    const sopsEncryptedHash = cryptoInner
      .createHash("sha512")
      .update(normalizedSopsEncryptedBuf)
      .digest("hex");

    if (unencryptedHash === sopsEncryptedHash) {
      console.log("File has not changed");
      process.exit(0);
    }

    try {
      await fsInner.writeFile(filePath, normalizedContentBuf, "binary");
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
      `const editor = ${String(editor)};`,
      `const content = ${JSON.stringify(encryptedContentBuf.toString("base64"))};`,
      "await editor(content, encryptionKey);",
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
  const { glob } = fastGlob;

  const files = await glob([...PULUMI_STATE_PATTERNS], {
    absolute: true,
    cwd: process.cwd(),
    ignore: [...PULUMI_ENCRYPTED_EXCLUDE_PATTERNS],
  });

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
