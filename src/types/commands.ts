import * as vscode from 'vscode';
import {CommandParameters} from '../cli-wrapper/constants';
import {IConfig} from '../cli-wrapper/types';
import {ScanType} from '../constants';

export interface IgnoreCommandConfig {
  scanType: ScanType;
  ignoreBy: CommandParameters.ByRule | CommandParameters.ByValue | CommandParameters.ByPath;
  param: string;
  document: vscode.TextDocument;
}

export interface CommandParams {
  config: IConfig;
  workspaceFolderPath: string;
}
