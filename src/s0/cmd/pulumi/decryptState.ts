import fastGlob from "fast-glob";
import path from "node:path";

import { Datamitsu } from "../../../lib";
import { getGPGTTY } from "../../utils/tty";
import {
  DEFAULT_CONCURRENCY_LIMIT,
  detectFileType,
  getDecryptedPath,
  PULUMI_ENCRYPTED_STATE_PATTERNS,
} from "./constants";

async function decryptFile(file: string, datamitsu: Datamitsu, GPG_TTY: string): Promise<void> {
  const relativePath = path.relative(process.cwd(), file);
  console.log(`📄 Decrypting: ${relativePath}`);

  const outputFile = getDecryptedPath(file);
  const fileType = detectFileType(file);

  // Let SOPS write the output file directly
  await datamitsu.exec(
    "sops",
    [
      "--decrypt",
      "--input-type",
      fileType,
      "--output-type",
      fileType,
      "--output",
      outputFile,
      file,
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, GPG_TTY },
    },
  );

  console.log(`   ✅ Decrypted: ${path.relative(process.cwd(), outputFile)}\n`);
}

export const pulumiDecrypt = async () => {
  const { glob } = fastGlob;

  const files = await glob([...PULUMI_ENCRYPTED_STATE_PATTERNS], {
    absolute: true,
    cwd: process.cwd(),
  });

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
      batch.map((file) => decryptFile(file, datamitsu, GPG_TTY)),
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
