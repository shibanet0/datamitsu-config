import { fix } from "@datamitsu/datamitsu";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface WriteAndFixOptions {
  content: string;
  encoding?: BufferEncoding;
  filePath: string;
  verbose?: boolean;
}

export interface WriteAndFixResult {
  filePath: string;
  fixResult?: {
    error?: string;
    success: boolean;
  };
  success: boolean;
}

/**
 * Writes content to a file and automatically runs datamitsu fix on it. Creates parent directories
 * if they don't exist.
 *
 * @param options - Configuration for writing and fixing the file
 * @returns Result object indicating success/failure
 */
export async function writeAndFix(options: WriteAndFixOptions): Promise<WriteAndFixResult> {
  const { content, encoding = "utf8", filePath, verbose = false } = options;

  try {
    // Step 1: Ensure directory exists
    mkdirSync(dirname(filePath), { recursive: true });

    // Step 2: Write the file
    writeFileSync(filePath, content, encoding);

    if (verbose) {
      console.log(`Wrote ${filePath}`);
    }

    // Step 3: Run fix on the specific file
    const fixResult = await fix({
      files: [filePath],
      stdio: "pipe",
    });

    if (verbose && fixResult.success) {
      console.log(`Fixed ${filePath}`);
    }

    return {
      filePath,
      fixResult: {
        error: "error" in fixResult ? fixResult.error : undefined,
        success: fixResult.success,
      },
      success: fixResult.success,
    };
  } catch (error) {
    return {
      filePath,
      fixResult: {
        error: error instanceof Error ? error.message : String(error),
        success: false,
      },
      success: false,
    };
  }
}
