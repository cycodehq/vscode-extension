import * as vscode from 'vscode';

export type CommandResult = {
  exitCode: number;
  result: any;
  stderr: string;
};

export interface IConfig {
  cliPath: string;
  cliAutoManaged: boolean;
  additionalParams: string[];
  cliEnv: { [key: string]: string };
  agentName: string;
  agentVersion: string;
  envName: string;
  envVersion: string;
  scanOnSaveEnabled: boolean;
  experimentalScaSyncFlow: boolean;
  experimentalSastSupport: boolean;
}

export type CliConfig = {
  cliPath: string;
};

export interface UserAgent {
  app_name: string;
  app_version: string;
  env_name: string;
  env_version: string;
}

export interface RunCliArgs {
  cliPath: string;
  cliEnv: { [key: string]: string };
  commandParams: string[];
  workspaceFolderPath?: string;
  printToOutput?: boolean;
}

export interface RunCliResult {
  getCancelPromise: () => Promise<void>;
  getResultPromise: () => Promise<CommandResult>;
}

export type ProgressBar = vscode.Progress<{ message?: string; increment?: number }>;
