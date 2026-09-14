import fs from "node:fs/promises";
import path from "node:path";

import { Datamitsu } from "../../../lib";
import { getGPGTTY } from "../../utils/tty";
import {
  DEFAULT_CONCURRENCY_LIMIT,
  detectFileType,
  getDecryptedPath,
  PULUMI_ENCRYPTED_STATE_PATTERNS,
} from "./constants";
import { isSameStateContent } from "./stateContent";
import { findStateFiles, writeFileAtomic } from "./stateFiles";
import { backupPlaintext, clearDecryptConflict, markDecryptConflict } from "./stateGuard";

export interface DecryptOptions {
  /**
   * Replace plaintext state that differs from its encrypted file. The previous plaintext is kept as
   * a backup in the user cache (see `getStateGuardDir`).
   */
  force?: boolean;
}

type DecryptOutcome = "created" | "replaced" | "unchanged";

async function decryptFile(
  file: string,
  datamitsu: Datamitsu,
  GPG_TTY: string,
  options: DecryptOptions,
): Promise<DecryptOutcome> {
  const relativePath = path.relative(process.cwd(), file);
  console.log(`📄 Decrypting: ${relativePath}`);

  const outputFile = getDecryptedPath(file);
  const relativeOutput = path.relative(process.cwd(), outputFile);
  const fileType = detectFileType(file);

  // Decrypt into memory instead of `--output`: SOPS truncates the target before writing, and the
  // plaintext may be newer than the encrypted file (a `pulumi up` that was not encrypted yet).
  const decryptedText = await decryptToMemory(file, fileType, datamitsu, GPG_TTY);

  const existing = await readIfExists(outputFile);

  if (existing === undefined) {
    await writeFileAtomic(outputFile, decryptedText);
    await clearDecryptConflict(outputFile);
    console.log(`   ✅ Decrypted: ${relativeOutput}\n`);
    return "created";
  }

  if (isSameStateContent(existing, decryptedText, fileType)) {
    await clearDecryptConflict(outputFile);
    console.log(`   ⏭️  Unchanged: ${relativeOutput}\n`);
    return "unchanged";
  }

  if (!options.force) {
    await markDecryptConflict(outputFile);
    throw new Error(
      `${relativeOutput} differs from ${relativePath}; refusing to overwrite local state.\n` +
        `   Encryption of this file is blocked until the difference is resolved:\n` +
        `   - local file is newer: encrypt-all-state --force\n` +
        `   - encrypted file is authoritative: decrypt-all-state --force (a backup is kept)`,
    );
  }

  const backup = await backupPlaintext(outputFile, existing);
  await writeFileAtomic(outputFile, decryptedText);
  await clearDecryptConflict(outputFile);
  console.log(`   ✅ Replaced: ${relativeOutput} (backup: ${backup})\n`);
  return "replaced";
}

/**
 * SOPS stdout is the plaintext, and execa copies stdout into its error message; a failure (for
 * example exceeding maxBuffer) must not print the state, so only non-sensitive fields are
 * rethrown.
 */
async function decryptToMemory(
  file: string,
  fileType: "json" | "yaml",
  datamitsu: Datamitsu,
  GPG_TTY: string,
): Promise<string> {
  try {
    const { stdout } = await datamitsu.exec(
      "sops",
      ["--decrypt", "--input-type", fileType, "--output-type", fileType, file],
      {
        cwd: process.cwd(),
        env: { ...process.env, GPG_TTY },
        stripFinalNewline: false,
      },
    );
    return String(stdout);
  } catch (error: unknown) {
    const { exitCode, stderr } = (error ?? {}) as { exitCode?: number; stderr?: unknown };
    const detail = typeof stderr === "string" && stderr.trim() ? `: ${stderr.trim()}` : "";
    throw new Error(
      `sops --decrypt failed for ${path.relative(process.cwd(), file)} (exit code ${exitCode ?? "unknown"})${detail}`,
      { cause: error },
    );
  }
}

async function readIfExists(file: string): Promise<Buffer | undefined> {
  try {
    return await fs.readFile(file);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export const pulumiDecrypt = async (options: DecryptOptions = {}) => {
  const files = await findStateFiles(PULUMI_ENCRYPTED_STATE_PATTERNS);

  console.log(`\n🔓 Found ${files.length} encrypted file(s) to decrypt:\n`);

  const datamitsu = new Datamitsu();
  const GPG_TTY = await getGPGTTY();

  // Process in batches
  const batchSize = DEFAULT_CONCURRENCY_LIMIT;
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    // oxlint-disable-next-line no-await-in-loop
    const results = await Promise.allSettled(
      batch.map((file) => decryptFile(file, datamitsu, GPG_TTY, options)),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error(`\n❌ Decryption error:`, result.reason);
        errors++;
      }
      processed++;
    }
  }

  console.log(`\n✨ Decryption complete! (${processed - errors}/${processed} succeeded)\n`);

  if (errors > 0) {
    process.exit(1);
  }
};
