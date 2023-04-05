import * as vscode from "vscode";
import extensionOutput from "../logging/extension-output";
import cliWrapper from "../cli-wrapper/cli-wrapper";
import statusBar from "../utils/status-bar";
import { TrayNotificationTexts } from "../utils/texts";

export async function checkCLI(context: vscode.ExtensionContext) {
  try {
    let { exitCode } = await cliWrapper.runUsage();

    if (exitCode === 0) {
      return;
    }

    // cli is missing. try to install:
    exitCode = (await cliWrapper.runInstall()).exitCode;

    if (exitCode !== 0) {
      throw new Error("Failed to install cycode cli");
    }

    // try again
    exitCode = (await cliWrapper.runUsage()).exitCode;

    if (exitCode !== 0) {
      throw new Error("Failed to install cycode cli");
    }
  } catch (error) {
    console.error(error);
    extensionOutput.error("Error while checking if cli exists: " + error);
    vscode.window.showErrorMessage(TrayNotificationTexts.InstallError);
    statusBar.showCliPathError();
  }
}
