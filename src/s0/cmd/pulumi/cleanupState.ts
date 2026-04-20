import { execa } from "execa";
import fastGlob from "fast-glob";
import fs from "node:fs/promises";
import path from "node:path";

import { Datamitsu } from "../../../lib";
import { hasMessage } from "../../../utils/typeGuards";
import { getGPGTTY } from "../../utils/tty";
import { detectFileType, getDecryptedPath, PULUMI_ENCRYPTED_STATE_PATTERNS } from "./constants";

/**
 * Check Git repository safety before cleanup
 */
async function checkGitSafety(): Promise<void> {
  // Check if we're in a git repository
  try {
    await execa("git", ["rev-parse", "--git-dir"], { cwd: process.cwd() });
  } catch {
    throw new Error("❌ Not in a git repository. Cleanup requires git for safety.");
  }

  // Check if we're at the root of the repository
  const { stdout: gitRoot } = await execa("git", ["rev-parse", "--show-toplevel"], {
    cwd: process.cwd(),
  });
  const currentDir = process.cwd();

  if (path.resolve(gitRoot) !== path.resolve(currentDir)) {
    throw new Error(
      `❌ Not at repository root.\n   Current: ${currentDir}\n   Root: ${gitRoot}\n   Please run from repository root.`,
    );
  }

  // Check for uncommitted changes
  const { stdout: status } = await execa("git", ["status", "--porcelain"], {
    cwd: process.cwd(),
  });

  if (status.trim()) {
    throw new Error(
      "❌ Uncommitted changes detected. Please commit or stash changes before cleanup.",
    );
  }

  // Check for unpushed commits
  try {
    const { stdout: unpushed } = await execa("git", ["log", "@{u}..", "--oneline"], {
      cwd: process.cwd(),
    });

    if (unpushed.trim()) {
      throw new Error("❌ Unpushed commits detected. Please push commits before cleanup.");
    }
  } catch (error: unknown) {
    // If there's no upstream branch, warn but allow
    if (hasMessage(error) && error.message.includes("no upstream")) {
      console.warn("⚠️  Warning: No upstream branch configured. Proceeding with caution...\n");
    } else {
      throw error;
    }
  }
}

/**
 * Verify encrypted file is valid by attempting to decrypt
 */
async function verifyEncryptedFile(
  encFile: string,
  datamitsu: Datamitsu,
  GPG_TTY: string,
): Promise<boolean> {
  try {
    await datamitsu.exec(
      "sops",
      [
        "--decrypt",
        "--input-type",
        detectFileType(encFile),
        "--output-type",
        detectFileType(encFile),
        encFile,
      ],
      {
        env: { ...process.env, GPG_TTY },
      },
    );
    return true;
  } catch {
    return false;
  }
}

export const pulumiCleanup = async () => {
  const { glob } = fastGlob;

  // Safety checks: ensure git repository is clean
  await checkGitSafety();

  // Find all encrypted files
  const encryptedFiles = await glob([...PULUMI_ENCRYPTED_STATE_PATTERNS], {
    absolute: true,
    cwd: process.cwd(),
  });

  console.log(`\n🧹 Scanning for unencrypted files to clean up...\n`);

  const datamitsu = new Datamitsu();
  const GPG_TTY = await getGPGTTY();

  const filesToRemove: string[] = [];

  for (const encFile of encryptedFiles) {
    const originalFile = getDecryptedPath(encFile);

    // Check if original exists
    // oxlint-disable-next-line no-await-in-loop
    const originalExists = await fs
      .access(originalFile)
      .then(() => true)
      .catch(() => false);

    if (!originalExists) {
      continue;
    }

    // Verify encrypted file is valid
    // oxlint-disable-next-line no-await-in-loop
    const isValid = await verifyEncryptedFile(encFile, datamitsu, GPG_TTY);

    if (isValid) {
      filesToRemove.push(originalFile);
    } else {
      console.warn(
        `⚠️  Warning: ${path.relative(process.cwd(), encFile)} failed verification, keeping original`,
      );
    }
  }

  if (filesToRemove.length === 0) {
    console.log(`✨ No unencrypted files to clean up!\n`);
    return;
  }

  // Show what will be removed
  console.log(`🗑️  Found ${filesToRemove.length} unencrypted file(s) to remove:\n`);
  for (const file of filesToRemove) {
    console.log(`   - ${path.relative(process.cwd(), file)}`);
  }

  // Remove files
  console.log(`\n🧹 Cleaning up...\n`);

  let removed = 0;
  for (const file of filesToRemove) {
    try {
      // oxlint-disable-next-line no-await-in-loop
      await fs.unlink(file);
      console.log(`   ✅ Removed: ${path.relative(process.cwd(), file)}`);
      removed++;
    } catch (error) {
      console.error(`   ❌ Failed to remove: ${path.relative(process.cwd(), file)}`, error);
    }
  }

  console.log(`\n✨ Cleanup complete! (${removed}/${filesToRemove.length} removed)\n`);
};
