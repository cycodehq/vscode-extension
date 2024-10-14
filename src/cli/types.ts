export interface CommandResult {
  exitCode: number;
  result: any;
  stderr: string;
}

export interface IConfig {
  cliPath: string;
  cliAutoManaged: boolean;
  additionalParams: string[];
  cliEnv: Record<string, string>;
  agentName: string;
  agentVersion: string;
  envName: string;
  envVersion: string;
  scanOnSaveEnabled: boolean;
}

export interface UserAgent {
  app_name: string;
  app_version: string;
  env_name: string;
  env_version: string;
}

export interface RunCliArgs {
  cliPath: string;
  cliEnv: Record<string, string>;
  commandParams: string[];
  workspaceFolderPath?: string;
  printToOutput?: boolean;
}

export interface RunCliResult {
  getCancelPromise: () => Promise<void>;
  getResultPromise: () => Promise<CommandResult>;
}
