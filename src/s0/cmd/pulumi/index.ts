import { Argument, Command } from "@commander-js/extra-typings";

import { pulumiCleanup } from "./cleanup-state";
import { pulumiDecrypt } from "./decrypt-state";
import { pulumiEncrypt } from "./encrypt-state";

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
    "resolve a refused decryption: decrypt-all-state replaces the differing plaintext (keeping a backup), encrypt-all-state encrypts it anyway",
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
        await pulumiEncrypt({ force: options.force === true });

        break;
      }
      // No default
    }
  });
