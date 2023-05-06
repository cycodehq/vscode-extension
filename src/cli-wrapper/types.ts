export type CommandResult = {
  exitCode: number;
  result: any;
  error: string;
};

export interface IConfig {
  cliPath: string;
  additionalParams: string[];
  cliEnv: { [key: string]: string };
}

export type CliConfig = {
  cliPath: string;
};
