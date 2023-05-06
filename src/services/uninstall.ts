import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import { TrayNotificationTexts } from "../utils/texts";
import { validateCliCommonErrors } from "./common";
import { IConfig } from "../cli-wrapper/types";

export async function uninstall(
  context: vscode.ExtensionContext,
  params: { workspaceFolderPath: string; config: IConfig }
) {
  extensionOutput.showOutputTab();

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
    },
    async (progress) => {
      try {
        progress.report({
          message: `Uninstall cycode CLI...`,
        });

        const { result, error, exitCode } = await cliWrapper.runUninstall(
          params
        );

        if (validateCliCommonErrors(error, exitCode)) {
          return;
        }

        // throw error
        if (exitCode !== 0) {
          throw new Error(error);
        }

        onUninstallComplete();
        extensionOutput.info(
          "Uninstall completed: " + JSON.stringify({ result, error }, null, 3)
        );
      } catch (error) {
        console.error(error);
        extensionOutput.error("Error while uninstalling: " + error);
        onUninstallFailed();
      }
    }
  );
}
function onUninstallFailed() {
  vscode.window.showErrorMessage(TrayNotificationTexts.UninstallError);
}

function onUninstallComplete() {
  vscode.window.showInformationMessage(
    TrayNotificationTexts.UninstallCompleted
  );
}
