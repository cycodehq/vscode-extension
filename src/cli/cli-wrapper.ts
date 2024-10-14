import { IgnoreCommandConfig } from '../types/commands';
import { CliCommands, CommandParameters, getScanTypeCliValue } from './constants';
import { IConfig, RunCliResult, UserAgent } from './types';
import { getRunnableCliCommand } from './runner';

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
  getRunnableAuthCommand: (params: {
    config: IConfig;
    workspaceFolderPath?: string;
  }): RunCliResult => {
    const { config, workspaceFolderPath } = params;
    const { cliEnv, cliPath } = config;

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
  getRunnableIgnoreCommand: (params: {
    config: IConfig;
    workspaceFolderPath?: string;
    ignoreConfig: IgnoreCommandConfig;
  }): RunCliResult => {
    const { config, ignoreConfig, workspaceFolderPath } = params;
    const { cliPath, cliEnv } = config;
    const { ignoreBy, param, scanType } = ignoreConfig;

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
