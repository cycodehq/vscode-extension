import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import statusBar from "../utils/status-bar";
import { TrayNotificationTexts } from "../utils/texts";
import { validateCliCommonErrors } from "./common";
import { IConfig } from "../cli-wrapper/types";
import TrayNotifications from "../utils/TrayNotifications";

export async function install(
  context: vscode.ExtensionContext,
  params: { workspaceFolderPath?: string; config: IConfig }
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
        extensionOutput.error("Error while installing: " + error);
        onInstallFailed();
      }
    }
  );
}

export function onInstallFailed() {
  TrayNotifications.showInstallFailed();
}

export function onInstallComplete() {
  statusBar.showDefault();
  TrayNotifications.showInstallSuccess();
}
