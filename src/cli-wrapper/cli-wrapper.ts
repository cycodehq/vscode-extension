import { IgnoreCommandConfig } from "../types/commands";
import { CliCommands, CommandParameters } from "./constants";
import { CommandResult, IConfig, UserAgent } from "./types";
import { runCli } from "./runner";

export const generateUserAgentCommandParam = (config: IConfig) => {
  const userAgent: UserAgent = {
    app_name: config.agentName,
    app_version: config.agentVersion,
    env_name: config.envName,
    env_version: config.envVersion,
  };

  return `${CommandParameters.UserAgent}='${JSON.stringify(userAgent)}'`;
};

export const cliWrapper = {
  runGetVersion: async (params: {
    config: IConfig;
    workspaceFolderPath: string;
  }): Promise<CommandResult> => {
    const { config } = params;
    return await runCli(
      config.cliPath,
      params.workspaceFolderPath,
      [CommandParameters.Version],
      config.cliEnv,
      true
    );
  },
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

    commandParams.push(generateUserAgentCommandParam(config));
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
  runScaScan: async (params: {
    config: IConfig;
    path: string;
    workspaceFolderPath: string;
  }): Promise<CommandResult> => {
    const commandParams: string[] = [];
    const { config } = params;

    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });

    commandParams.push(generateUserAgentCommandParam(config));
    commandParams.push(CliCommands.Scan);
    commandParams.push(CommandParameters.scanType);
    commandParams.push(CommandParameters.SCAScanType);
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
    commandParams.push(generateUserAgentCommandParam(config));
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
    ignoreConfig: IgnoreCommandConfig;
  }): Promise<CommandResult> => {
    const commandParams: string[] = [];
    const { config, ignoreConfig } = params;
    const { ignoreBy, param } = ignoreConfig;
    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });
    commandParams.push(generateUserAgentCommandParam(config));
    commandParams.push(CliCommands.Ignore);
    commandParams.push(ignoreBy);
    commandParams.push(param);

    return await runCli(
      config.cliPath,
      params.workspaceFolderPath,
      commandParams,
      config.cliEnv
    );
  },
};

export default cliWrapper;
