import * as vscode from 'vscode';
import {IgnoreCommandConfig} from '../types/commands';
import {CliCommands, CommandParameters, getScanTypeCliValue} from './constants';
import {IConfig, RunCliResult, UserAgent} from './types';
import {getRunnableCliCommand} from './runner';
import {experimentalScaSyncFlowProperty, extensionId} from '../utils/texts';

export const generateUserAgentCommandParam = (config: IConfig) => {
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
  getRunnableGetVersionLegacyCommand: (params: {
    config: IConfig;
    workspaceFolderPath: string;
  }): RunCliResult => {
    // support for legacy versions of the CLI (< 1.0.0)
    const {config, workspaceFolderPath} = params;
    const {cliPath, cliEnv} = config;

    return getRunnableCliCommand({
      cliPath,
      workspaceFolderPath,
      commandParams: [CommandParameters.Version],
      cliEnv,
      printToOutput: true,
    });
  },
  getRunnableGetVersionCommand: (params: {
    config: IConfig;
    workspaceFolderPath?: string;
  }): RunCliResult => {
    const {config, workspaceFolderPath} = params;
    const {cliPath, cliEnv} = config;

    return getRunnableCliCommand({
      cliPath,
      workspaceFolderPath,
      commandParams: [CliCommands.Version],
      cliEnv,
      printToOutput: true,
    });
  },
  getRunnableSecretsScanCommand: (params: {
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
    commandParams.push(CommandParameters.SCAScanType);

    const experimentalScaSyncFlowPropertyEnabled =
        vscode.workspace.getConfiguration(extensionId).get(experimentalScaSyncFlowProperty);
    if (experimentalScaSyncFlowPropertyEnabled) {
      // TODO(MarshalX): remove experimental setting if stable
      commandParams.push(CommandParameters.Sync);
      commandParams.push(CommandParameters.NoRestore);
    }

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

    return getRunnableCliCommand({cliPath, cliEnv, commandParams});
  },
  getRunnablePipInstallCommand: (params: {
    config: IConfig;
    workspaceFolderPath?: string;
  }): RunCliResult => {
    const commandParams: string[] = [];
    const {config, workspaceFolderPath} = params;
    const {cliEnv} = config;
    commandParams.push('install');
    commandParams.push('--upgrade');
    commandParams.push('cycode');

    return getRunnableCliCommand({
      cliPath: 'pip',
      workspaceFolderPath,
      commandParams,
      cliEnv,
      printToOutput: true,
    });
  },
  getRunnablePipUninstallCommand: (params: {
    config: IConfig;
    workspaceFolderPath?: string;
  }): RunCliResult => {
    const {config, workspaceFolderPath} = params;
    const {cliEnv} = config;

    return getRunnableCliCommand({
      cliPath: 'pip3',
      workspaceFolderPath,
      commandParams: ['uninstall', '-y', 'cycode'],
      cliEnv,
      printToOutput: true,
    });
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
