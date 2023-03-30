import * as vscode from "vscode";
import { CliCommands, CommandParameters } from "./constants";
import { CommandResult } from "./types";
import { runCli } from "./runner";
import { extensionId } from "../utils/texts";

const defaultParams = [CommandParameters.ScanInfoFormatJson];

const config = {
  get cliPath() {
    return (
      (vscode.workspace
        .getConfiguration(extensionId)
        .get("cliPath") as string) || "cycode"
    );
  },
};

export const cliWrapper = {
  config,

  runScan: async (params: { path: string }): Promise<CommandResult> => {
    const commandParams: string[] = [];
    commandParams.push(CliCommands.Scan);
    commandParams.push(...defaultParams);
    commandParams.push(CliCommands.Path);
    commandParams.push(params.path);

    return await runCli(config.cliPath, commandParams);
  },
  runAuth: async (): Promise<CommandResult> => {
    const commandParams: string[] = [];
    commandParams.push(CliCommands.Auth);

    return await runCli(config.cliPath, commandParams);
  },
  runInstall: async (): Promise<CommandResult> => {
    return await runCli("pip3", ["install", "--user", "cycode"], true);
  },
  runUninstall: async (): Promise<CommandResult> => {
    return await runCli("pip3", ["uninstall", "-y", "cycode"], true);
  },
  runUsage: async (): Promise<CommandResult> => {
    return await runCli(config.cliPath, [CommandParameters.Usage], true);
  },
};

export default cliWrapper;
