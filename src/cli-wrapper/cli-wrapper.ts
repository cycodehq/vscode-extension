import * as vscode from "vscode";
import { Commands, CommandParameters } from "./constants";
import { CommandResult } from "./types";
import { runCli } from "./runner";
import { Texts } from "../utils/texts";

const defaultParams = [CommandParameters.ScanInfoFormatJson];

const config = {
  get cliPath() {
    return (
      (vscode.workspace
        .getConfiguration(Texts.ExtensionName.toLocaleLowerCase())
        .get("cliPath") as string) || ""
    );
  },
};

export const cliWrapper = {
  config,

  runScan: async (params: { path: string }): Promise<CommandResult> => {
    const commandParams: string[] = [];
    commandParams.push(Commands.Scan);
    commandParams.push(...defaultParams);
    commandParams.push(Commands.Path);
    commandParams.push(params.path);

    return await runCli(config.cliPath, commandParams);
  },
  configure: async (params: {
    client_id: string;
    secret: string;
  }): Promise<CommandResult> => {
    //TODO:: FIX THIS
    const commandParams: string[] = [];
    commandParams.push(Commands.Configure);

    console.error("configure fails here");
    return await runCli(config.cliPath, commandParams);
  },
};

export default cliWrapper;
