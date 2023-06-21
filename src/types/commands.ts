import { CommandParameters } from "../cli-wrapper/constants";

export interface IgnoreCommandConfig {
  ignoreBy: CommandParameters.ByRule | CommandParameters.ByValue;
  param: string;
}
