import { program } from "@commander-js/extra-typings";

import { pulumiCommand } from "./cmd/pulumi";

program.addCommand(pulumiCommand).parse();
