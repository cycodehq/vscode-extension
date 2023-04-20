import * as vscode from "vscode";
import { CliCommands, CommandParameters } from "./constants";
import { CommandResult } from "./types";
import { runCli } from "./runner";
import { extensionId } from "../utils/texts";

const config = {
  get cliPath() {
    return (
      (vscode.workspace
        .getConfiguration(extensionId)
        .get("cliPath") as string) || "cycode"
    );
  },
  get cliEnv(): { [key: string]: string } {
    const CYCODE_API_URL = vscode.workspace
      .getConfiguration(extensionId)
      .get("apiUrl") as string;

    const CYCODE_APP_URL = vscode.workspace
      .getConfiguration(extensionId)
      .get("appUrl") as string;

    const env = { CYCODE_API_URL, CYCODE_APP_URL };

    // Remove entries with empty values
    return Object.fromEntries(Object.entries(env).filter(([_, v]) => !!v));
  },
  get additionalParams() {
    const additionalParams = vscode.workspace
      .getConfiguration(extensionId)
      .get("additionalParameters") as string;

    return additionalParams ? additionalParams.split(" ") : [];
  },
};

export const cliWrapper = {
  config,

  runScan: async (params: {
    path: string;
    workspaceFolderPath: string;
  }): Promise<CommandResult> => {
    const commandParams: string[] = [];

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
    workspaceFolderPath: string;
  }): Promise<CommandResult> => {
    const commandParams: string[] = [];
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
    workspaceFolderPath: string;
  }): Promise<CommandResult> => {
    const commandParams: string[] = [];
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
    workspaceFolderPath: string;
  }): Promise<CommandResult> => {
    return await runCli(
      "pip3",
      params.workspaceFolderPath,
      ["uninstall", "-y", "cycode"],
      config.cliEnv,
      true
    );
  },
  runUsage: async (params: {
    workspaceFolderPath: string;
  }): Promise<CommandResult> => {
    return await runCli(
      config.cliPath,
      params.workspaceFolderPath,
      [CommandParameters.Usage],
      config.cliEnv,
      true
    );
  },
  runIgnore: async (params: {
    rule: string;
    workspaceFolderPath: string;
  }): Promise<CommandResult> => {
    const commandParams: string[] = [];
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
