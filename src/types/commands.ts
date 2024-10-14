import { CommandParameters } from '../cli/constants';
import { IConfig } from '../cli/types';
import { ScanType } from '../constants';

export interface IgnoreCommandConfig {
  scanType: ScanType;
  ignoreBy: CommandParameters.ByRule | CommandParameters.ByValue | CommandParameters.ByPath;
  param: string;
  filePath: string;
}

export interface CommandParams {
  config: IConfig;
  workspaceFolderPath: string;
}
