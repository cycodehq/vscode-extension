import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import statusBar from "../utils/status-bar";
import { TrayNotificationTexts } from "../utils/texts";
import { validateCliCommonErrors } from "./common";

export async function install(
  context: vscode.ExtensionContext,
  params: { workspaceFolderPath: string }
) {
  extensionOutput.showOutputTab();

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
    },
    async (progress) => {
      try {
        progress.report({
          message: `Install with pip3...`,
        });

        const { result, error, exitCode } = await cliWrapper.runInstall(params);

        if (validateCliCommonErrors(error, exitCode)) {
          return;
        }

        // throw error
        if (exitCode !== 0) {
          throw new Error(error);
        }

        onInstallComplete();
        extensionOutput.info(
          "Install completed: " + JSON.stringify({ result, error }, null, 3)
        );
      } catch (error) {
        console.error(error);
        extensionOutput.error("Error while installing: " + error);
        onInstallFailed();
      }
    }
  );
}

export function onInstallFailed() {
  vscode.window.showErrorMessage(TrayNotificationTexts.InstallError);
}

export function onInstallComplete() {
  vscode.window.showInformationMessage(TrayNotificationTexts.InstallCompleted);
  statusBar.showDefault();
}
