import { resolve } from "../../ignore/profile";
import { yamlProfile } from "../../ignore/profiles/yaml";

export const yamlIgnore: string[] = resolve(yamlProfile);
