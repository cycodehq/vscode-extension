import * as vscode from "vscode";

import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import statusBar from "../utils/status-bar";
import { validateCliCommonErrors } from "./common";
import { IConfig } from "../cli-wrapper/types";
import { IgnoreCommandConfig } from "../types/commands";
import { scan } from "./scanner";
import TrayNotifications from "../utils/TrayNotifications";

export async function ignore(
  context: vscode.ExtensionContext,
  params: {
    workspaceFolderPath: string;
    config: IConfig;
    ignoreConfig: IgnoreCommandConfig;
    diagnosticCollection: vscode.DiagnosticCollection;
  }
) {
  try {
    const { result, error, exitCode } = await cliWrapper.runIgnore(params);

    if (validateCliCommonErrors(error, exitCode)) {
      return;
    }

    // throw error
    if (exitCode !== 0) {
      throw new Error(error);
    }

    onIgnoreComplete();
    extensionOutput.info(
      "Ignore completed: " + JSON.stringify({ result, error }, null, 3)
    );
    scan(context, {
      workspaceFolderPath: params.workspaceFolderPath,
      diagnosticCollection: params.diagnosticCollection,
      config: params.config,
    });
  } catch (error) {
    extensionOutput.error("Error while ignoring: " + error);
    onIgnoreFailed();
  }
}

export function onIgnoreFailed() {
  TrayNotifications.showIgnoreFailed();
}

export function onIgnoreComplete() {
  TrayNotifications.showIgnoreSuccess();
  statusBar.showDefault();
}
