import {IgnoreCommandConfig} from '../types/commands';
import {CliCommands, CommandParameters, getScanTypeCliValue} from './constants';
import {IConfig, RunCliResult, UserAgent} from './types';
import {getRunnableCliCommand} from './runner';

const generateUserAgentCommandParam = (config: IConfig) => {
  const userAgent: UserAgent = {
    app_name: config.agentName,
    app_version: config.agentVersion,
    env_name: config.envName,
    env_version: config.envVersion,
  };

  // escape double quotes
  const userAgentString = JSON.stringify(userAgent).replace(/"/g, '\\"');
  return `${CommandParameters.UserAgent}="${userAgentString}"`;
};

export const cliWrapper = {
  getRunnableGetVersionCommand: (params: {
    config: IConfig;
    workspaceFolderPath?: string;
  }): RunCliResult => {
    const {config, workspaceFolderPath} = params;
    const {cliPath, cliEnv} = config;

    const commandParams: string[] = [];
    commandParams.push(generateUserAgentCommandParam(config));
    commandParams.push(CommandParameters.OutputFormatJson);
    commandParams.push(CliCommands.Version);

    return getRunnableCliCommand({
      cliPath,
      workspaceFolderPath,
      commandParams,
      cliEnv,
      printToOutput: true,
    });
  },
  getRunnableSecretScanCommand: (params: {
    config: IConfig;
    path: string;
    workspaceFolderPath?: string;
  }): RunCliResult => {
    const {config, workspaceFolderPath} = params;
    const {cliPath, cliEnv} = config;

    const commandParams: string[] = [];
    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });

    commandParams.push(generateUserAgentCommandParam(config));
    commandParams.push(CommandParameters.OutputFormatJson);

    commandParams.push(CliCommands.Scan);
    commandParams.push(CommandParameters.scanType);
    commandParams.push(CommandParameters.secretScanType);
    commandParams.push(CommandParameters.Sync);

    commandParams.push(CliCommands.Path);
    commandParams.push(`"${params.path}"`);

    return getRunnableCliCommand({
      cliPath,
      workspaceFolderPath,
      commandParams,
      cliEnv,
      printToOutput: true,
    });
  },
  getRunnableScaScanCommand: (params: {
    config: IConfig;
    path: string;
    workspaceFolderPath?: string;
  }): RunCliResult => {
    const commandParams: string[] = [];
    const {config, workspaceFolderPath} = params;
    const {cliEnv, cliPath} = config;

    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });

    commandParams.push(generateUserAgentCommandParam(config));
    commandParams.push(CommandParameters.OutputFormatJson);

    commandParams.push(CliCommands.Scan);
    commandParams.push(CommandParameters.scanType);
    commandParams.push(CommandParameters.scaScanType);
    commandParams.push(CommandParameters.Sync);
    commandParams.push(CommandParameters.NoRestore);

    commandParams.push(CliCommands.Path);
    commandParams.push(`"${params.path}"`);

    return getRunnableCliCommand({
      cliPath,
      workspaceFolderPath,
      commandParams,
      cliEnv,
      printToOutput: true,
    });
  },
  getRunnableIacScanCommand: (params: {
    config: IConfig;
    path: string;
    workspaceFolderPath?: string;
  }): RunCliResult => {
    const {config, workspaceFolderPath} = params;
    const {cliPath, cliEnv} = config;

    const commandParams: string[] = [];
    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });

    commandParams.push(generateUserAgentCommandParam(config));
    commandParams.push(CommandParameters.OutputFormatJson);

    commandParams.push(CliCommands.Scan);
    commandParams.push(CommandParameters.scanType);
    commandParams.push(CommandParameters.iacScanType);
    commandParams.push(CommandParameters.Sync);

    commandParams.push(CliCommands.Path);
    commandParams.push(`"${params.path}"`);

    return getRunnableCliCommand({
      cliPath,
      workspaceFolderPath,
      commandParams,
      cliEnv,
      printToOutput: true,
    });
  },
  getRunnableSastScanCommand: (params: {
    config: IConfig;
    path: string;
    workspaceFolderPath?: string;
  }): RunCliResult => {
    const {config, workspaceFolderPath} = params;
    const {cliPath, cliEnv} = config;

    const commandParams: string[] = [];
    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });

    commandParams.push(generateUserAgentCommandParam(config));
    commandParams.push(CommandParameters.OutputFormatJson);

    commandParams.push(CliCommands.Scan);
    commandParams.push(CommandParameters.scanType);
    commandParams.push(CommandParameters.sastScanType);

    commandParams.push(CliCommands.Path);
    commandParams.push(`"${params.path}"`);

    return getRunnableCliCommand({
      cliPath,
      workspaceFolderPath,
      commandParams,
      cliEnv,
      printToOutput: true,
    });
  },
  getRunnableAuthCommand: (params: {
    config: IConfig;
    workspaceFolderPath?: string;
  }): RunCliResult => {
    const {config, workspaceFolderPath} = params;
    const {cliEnv, cliPath} = config;

    const commandParams: string[] = [];

    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });
    commandParams.push(generateUserAgentCommandParam(config));
    commandParams.push(CliCommands.Auth);

    return getRunnableCliCommand({
      cliPath,
      workspaceFolderPath,
      commandParams,
      cliEnv,
    });
  },
  getRunnableAuthCheckCommand: (config: IConfig): RunCliResult => {
    const commandParams: string[] = [];
    const {cliPath, cliEnv} = config;
    commandParams.push(CommandParameters.OutputFormatJson);
    commandParams.push(CliCommands.AuthCheck);

    return getRunnableCliCommand({cliPath, cliEnv, commandParams, printToOutput: true});
  },
  getRunnableIgnoreCommand: (params: {
    config: IConfig;
    workspaceFolderPath?: string;
    ignoreConfig: IgnoreCommandConfig;
  }): RunCliResult => {
    const {config, ignoreConfig, workspaceFolderPath} = params;
    const {cliPath, cliEnv} = config;
    const {ignoreBy, param, scanType} = ignoreConfig;

    const commandParams: string[] = [];
    config.additionalParams.forEach((param) => {
      commandParams.push(param);
    });
    commandParams.push(CliCommands.Ignore);
    commandParams.push(CommandParameters.scanType);
    commandParams.push(getScanTypeCliValue(scanType));
    commandParams.push(ignoreBy);
    commandParams.push(`"${param}"`);

    return getRunnableCliCommand({
      cliPath,
      workspaceFolderPath,
      commandParams,
      cliEnv,
      printToOutput: true,
    });
  },
};

export default cliWrapper;
