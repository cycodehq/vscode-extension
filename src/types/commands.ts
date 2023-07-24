import { CommandParameters } from "../cli-wrapper/constants";
import { IConfig } from "../cli-wrapper/types";

export interface IgnoreCommandConfig {
  ignoreBy: CommandParameters.ByRule | CommandParameters.ByValue;
  param: string;
}

export interface CommandParams {
  config: IConfig;
  workspaceFolderPath: string;
}
