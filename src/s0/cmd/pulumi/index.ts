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
  .action(async (type: "cleanup-all-state" | "decrypt-all-state" | "encrypt-all-state") => {
    switch (type) {
      case "cleanup-all-state": {
        await pulumiCleanup();

        break;
      }
      case "decrypt-all-state": {
        await pulumiDecrypt();

        break;
      }
      case "encrypt-all-state": {
        await pulumiEncrypt();

        break;
      }
      // No default
    }
  });
