export type CommandResult = {
  exitCode: number;
  result: any;
  error: string;
};

export interface IConfig {
  cliPath: string;
  additionalParams: string[];
  cliEnv: { [key: string]: string };
  agentName: string;
  agentVersion: string;
  envName: string;
  envVersion: string;
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
