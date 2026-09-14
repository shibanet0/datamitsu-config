import { Argument, Command } from "@commander-js/extra-typings";

import { pulumiCleanup } from "./cleanupState";
import { pulumiDecrypt } from "./decryptState";
import { pulumiEncrypt } from "./encryptState";

export const pulumiCommand = new Command("pulumi-sops")
  .addArgument(
    new Argument("<type>", "Type of operation").choices([
      "encrypt-all-state",
      "decrypt-all-state",
      "cleanup-all-state",
    ] as const),
  )
  .option(
    "--force",
    "decrypt-all-state: replace plaintext state that differs from its encrypted file (keeps a backup)",
  )
  .action(async (type, options) => {
    switch (type) {
      case "cleanup-all-state": {
        await pulumiCleanup();

        break;
      }
      case "decrypt-all-state": {
        await pulumiDecrypt({ force: options.force === true });

        break;
      }
      case "encrypt-all-state": {
        await pulumiEncrypt();

        break;
      }
      // No default
    }
  });
