import * as vscode from "vscode";
import { CliCommands, CommandParameters } from "./constants";
import { CommandResult, IConfig } from "./types";
import { runCli } from "./runner";

export const cliWrapper = {
  runScan: async (params: {
    config: IConfig;
    path: string;
    workspaceFolderPath: string;
  }): Promise<CommandResult> => {
    const commandParams: string[] = [];
    const { config } = params;

    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });

    commandParams.push(CliCommands.Scan);
    commandParams.push(CommandParameters.OutputFormatJson);
    commandParams.push(CliCommands.Path);
    commandParams.push(params.path);

    return await runCli(
      config.cliPath,
      params.workspaceFolderPath,
      commandParams,
      config.cliEnv
    );
  },
  runAuth: async (params: {
    config: IConfig;
    workspaceFolderPath: string;
  }): Promise<CommandResult> => {
    const commandParams: string[] = [];
    const { config } = params;

    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });
    commandParams.push(CliCommands.Auth);

    return await runCli(
      config.cliPath,
      params.workspaceFolderPath,
      commandParams,
      config.cliEnv
    );
  },
  runInstall: async (params: {
    config: IConfig;
    workspaceFolderPath: string;
  }): Promise<CommandResult> => {
    const commandParams: string[] = [];
    const { config } = params;
    commandParams.push("install");
    if (process.platform === "darwin") {
      commandParams.push("--user");
    }
    commandParams.push("cycode");

    return await runCli(
      "pip3",
      params.workspaceFolderPath,
      commandParams,
      config.cliEnv,
      true
    );
  },
  runUninstall: async (params: {
    config: IConfig;
    workspaceFolderPath: string;
  }): Promise<CommandResult> => {
    const { config } = params;
    return await runCli(
      "pip3",
      params.workspaceFolderPath,
      ["uninstall", "-y", "cycode"],
      config.cliEnv,
      true
    );
  },
  runUsage: async (params: {
    config: IConfig;
    workspaceFolderPath: string;
  }): Promise<CommandResult> => {
    const { config } = params;
    return await runCli(
      config.cliPath,
      params.workspaceFolderPath,
      [CommandParameters.Usage],
      config.cliEnv,
      true
    );
  },
  runIgnore: async (params: {
    config: IConfig;
    workspaceFolderPath: string;
    rule: string;
  }): Promise<CommandResult> => {
    const commandParams: string[] = [];
    const { config } = params;
    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });
    commandParams.push(CliCommands.Ignore);
    commandParams.push(CommandParameters.ByRule);
    commandParams.push(params.rule);

    return await runCli(
      config.cliPath,
      params.workspaceFolderPath,
      commandParams,
      config.cliEnv
    );
  },
};

export default cliWrapper;
