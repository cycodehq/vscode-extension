import * as vscode from "vscode";
import extensionOutput from "../logging/extension-output";
import cliWrapper from "../cli-wrapper/cli-wrapper";
import statusBar from "../utils/status-bar";
import { TrayNotificationTexts } from "../utils/texts";

export async function checkCLI(
  context: vscode.ExtensionContext,
  params: { workspaceFolderPath: string }
) {
  try {
    extensionOutput.info("Trying to run CLI...");
    let { exitCode } = await cliWrapper.runUsage(params);

    if (exitCode === 0) {
      extensionOutput.info("CLI found!");
      return;
    }

    // CLI is missing. try to install:
    extensionOutput.info("CLI not found. Trying to install...");
    exitCode = (await cliWrapper.runInstall(params)).exitCode;

    if (exitCode !== 0) {
      extensionOutput.error("Failed to install cycode CLI");
      throw new Error("Failed to install cycode CLI");
    }

    // try again
    extensionOutput.info("Trying to run CLI after install...");
    exitCode = (await cliWrapper.runUsage(params)).exitCode;

    if (exitCode !== 0) {
      throw new Error("Failed to install cycode CLI");
    }
    extensionOutput.info("CLI Installed!");
  } catch (error) {
    console.error(error);
    extensionOutput.error("Error while checking if CLI exists: " + error);
    vscode.window.showErrorMessage(TrayNotificationTexts.InstallError);
    statusBar.showCliPathError();
  }
}
