import * as vscode from "vscode";

import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import statusBar from "../utils/status-bar";
import { TrayNotificationTexts } from "../utils/texts";
import { validateCliCommonErrors } from "./common";
import { IConfig } from "../cli-wrapper/types";
import { VscodeCommands } from "../utils/commands";
import { scan } from "./scanner";

export async function ignore(
  context: vscode.ExtensionContext,
  params: {
    rule: string;
    workspaceFolderPath: string;
    config: IConfig;
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
    console.error(error);
    extensionOutput.error("Error while Ignoreing: " + error);
    onIgnoreFailed();
  }
}

export function onIgnoreFailed() {
  vscode.window.showErrorMessage(TrayNotificationTexts.IgnoreError);
}

export function onIgnoreComplete() {
  vscode.window.showInformationMessage(TrayNotificationTexts.IgnoreCompleted);
  statusBar.showDefault();
}
