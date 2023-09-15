import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import { TrayNotificationTexts } from "../utils/texts";
import { validateCliCommonErrors } from "./common";
import { IConfig } from "../cli-wrapper/types";
import TrayNotifications from "../utils/TrayNotifications";

export async function uninstall(
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
          message: `Uninstall cycode CLI...`,
        });

        const { stderr, exitCode } = await cliWrapper.getRunnablePipUninstallCommand(
          params
        ).getResultPromise();

        if (validateCliCommonErrors(stderr, exitCode)) {
          return;
        }

        // throw error
        if (exitCode !== 0) {
          throw new Error(stderr);
        }

        onUninstallComplete();
      } catch (error) {
        extensionOutput.error("Error while uninstalling: " + error);
        onUninstallFailed();
      }
    }
  );
}

function onUninstallFailed() {
  TrayNotifications.showUninstallFailed();
}

function onUninstallComplete() {
  TrayNotifications.showUninstallSuccess();
}
