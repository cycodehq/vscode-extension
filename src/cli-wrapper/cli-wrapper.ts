import { CommandParams, IgnoreCommandConfig } from "../types/commands";
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
  runGetVersionLegacy: async (params: {
    config: IConfig;
    workspaceFolderPath: string;
  }): Promise<CommandResult> => {
    // support for legacy versions of the CLI (< 1.0.0)
    const { config, workspaceFolderPath } = params;
    const { cliPath, cliEnv } = config;

    return await runCli({
      cliPath,
      workspaceFolderPath,
      commandParams: [CommandParameters.Version],
      cliEnv,
      printToOutput: true,
    });
  },
  runGetVersion: async (params: {
    config: IConfig;
    workspaceFolderPath?: string;
  }): Promise<CommandResult> => {
    const { config, workspaceFolderPath } = params;
    const { cliPath, cliEnv } = config;

    return await runCli({
      cliPath,
      workspaceFolderPath,
      commandParams: [CliCommands.Version],
      cliEnv,
      printToOutput: true,
    });
  },
  runScan: async (params: {
    config: IConfig;
    path: string;
    workspaceFolderPath?: string;
  }): Promise<CommandResult> => {
    const { config, workspaceFolderPath } = params;
    const { cliPath, cliEnv } = config;

    const commandParams: string[] = [];
    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });

    commandParams.push(generateUserAgentCommandParam(config));
    commandParams.push(CommandParameters.OutputFormatJson);
    commandParams.push(CliCommands.Scan);
    commandParams.push(CliCommands.Path);
    commandParams.push(`"${params.path}"`);

    return await runCli({
      cliPath,
      workspaceFolderPath,
      commandParams,
      cliEnv,
    });
  },
  runScaScan: async (params: {
    config: IConfig;
    path: string;
    workspaceFolderPath?: string;
  }): Promise<CommandResult> => {
    const commandParams: string[] = [];
    const { config, workspaceFolderPath } = params;
    const { cliEnv, cliPath } = config;

    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });

    commandParams.push(generateUserAgentCommandParam(config));
    commandParams.push(CommandParameters.OutputFormatJson);
    commandParams.push(CliCommands.Scan);
    commandParams.push(CommandParameters.scanType);
    commandParams.push(CommandParameters.SCAScanType);
    commandParams.push(CliCommands.Path);
    commandParams.push(`"${params.path}"`);

    return await runCli({
      cliPath,
      workspaceFolderPath,
      commandParams,
      cliEnv
    });
  },
  runAuth: async (params: {
    config: IConfig;
    workspaceFolderPath?: string;
  }): Promise<CommandResult> => {
    const { config, workspaceFolderPath } = params;
    const { cliEnv, cliPath } = config;

    const commandParams: string[] = [];

    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });
    commandParams.push(generateUserAgentCommandParam(config));
    commandParams.push(CliCommands.Auth);

    return await runCli({
      cliPath,
      workspaceFolderPath,
      commandParams,
      cliEnv,
    });
  },
  runAuthCheck: async (config: IConfig): Promise<CommandResult> => {
    const commandParams: string[] = [];
    const { cliPath, cliEnv } = config;
    commandParams.push(CommandParameters.OutputFormatJson);
    commandParams.push(CliCommands.AuthCheck);

    return await runCli({ cliPath, cliEnv, commandParams });
  },
  runInstall: async (params: {
    config: IConfig;
    workspaceFolderPath?: string;
  }): Promise<CommandResult> => {
    const commandParams: string[] = [];
    const { config, workspaceFolderPath } = params;
    const { cliEnv } = config;
    commandParams.push("install");
    commandParams.push("--upgrade");
    commandParams.push("cycode");

    return await runCli({
      cliPath: "pip",
      workspaceFolderPath,
      commandParams,
      cliEnv,
      printToOutput: true,
    });
  },
  runUninstall: async (params: {
    config: IConfig;
    workspaceFolderPath?: string;
  }): Promise<CommandResult> => {
    const { config, workspaceFolderPath } = params;
    const { cliEnv } = config;

    return await runCli({
      cliPath: "pip3",
      workspaceFolderPath,
      commandParams: ["uninstall", "-y", "cycode"],
      cliEnv,
      printToOutput: true,
    });
  },
  runUsage: async (params: {
    config: IConfig;
    workspaceFolderPath?: string;
  }): Promise<CommandResult> => {
    const { config, workspaceFolderPath } = params;
    const { cliEnv, cliPath } = config;

    return await runCli({
      cliPath,
      workspaceFolderPath,
      commandParams: [CommandParameters.Usage],
      cliEnv,
      printToOutput: true,
    });
  },
  runIgnore: async (params: {
    config: IConfig;
    workspaceFolderPath?: string;
    ignoreConfig: IgnoreCommandConfig;
  }): Promise<CommandResult> => {
    const { config, ignoreConfig, workspaceFolderPath } = params;
    const { cliPath, cliEnv } = config;
    const { ignoreBy, param } = ignoreConfig;

    const commandParams: string[] = [];
    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });
    commandParams.push(generateUserAgentCommandParam(config));
    commandParams.push(CliCommands.Ignore);
    commandParams.push(ignoreBy);
    commandParams.push(param);

    return await runCli({
      cliPath,
      workspaceFolderPath,
      commandParams,
      cliEnv,
    });
  },
};

export default cliWrapper;
