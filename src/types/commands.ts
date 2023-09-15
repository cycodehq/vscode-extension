import * as vscode from 'vscode';
import {CommandParameters} from '../cli-wrapper/constants';
import {IConfig} from '../cli-wrapper/types';

export interface IgnoreCommandConfig {
  ignoreBy: CommandParameters.ByRule | CommandParameters.ByValue | CommandParameters.ByPath;
  param: string;
  document: vscode.TextDocument;
}

export interface CommandParams {
  config: IConfig;
  workspaceFolderPath: string;
}
