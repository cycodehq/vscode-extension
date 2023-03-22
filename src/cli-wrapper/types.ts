export type CommandResult = {
  exitCode: number;
  result: any;
  error: string;
};

export type CliConfig = {
  cliPath: string;
};
