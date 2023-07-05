import * as vscode from "vscode";
import * as semver from "semver";
import extensionOutput from "../logging/extension-output";
import cliWrapper from "../cli-wrapper/cli-wrapper";
import statusBar from "../utils/status-bar";
import { TrayNotificationTexts } from "../utils/texts";
import { IConfig } from "../cli-wrapper/types";
import { MinCLIVersion } from "../cli-wrapper/constants";
import { showInvalidCLIVersionError } from "../utils/TrayNotifications";

const validateCLI = async (params: {
  workspaceFolderPath: string;
  config: IConfig;
}): Promise<boolean> => {
  const { exitCode, result } = await cliWrapper.runGetVersion(params);

  if (exitCode !== 0) {
    return false;
  }

  extensionOutput.info("CLI found!");
  const currentVersion = result.data.split(" ")[2].trim();

  if (!semver.satisfies(currentVersion, `>=${MinCLIVersion}`)) {
    extensionOutput.error(
      `CLI version is ${result} but minimum required version is ${MinCLIVersion}`
    );
    showInvalidCLIVersionError(currentVersion, MinCLIVersion);
  }

  return true;
};

export async function checkCLI(
  context: vscode.ExtensionContext,
  params: { workspaceFolderPath: string; config: IConfig }
) {
  try {
    extensionOutput.info("Trying to run CLI...");
    const cliExist = await validateCLI(params);

    if (cliExist) {
      return;
    }

    // CLI is missing. try to install:
    extensionOutput.info("CLI not found. Trying to install...");
    const exitCode = (await cliWrapper.runInstall(params)).exitCode;

    if (exitCode !== 0) {
      extensionOutput.error("Failed to install cycode CLI");
      throw new Error("Failed to install cycode CLI");
    }

    // try again
    extensionOutput.info("Trying to run CLI after install...");
    const cliExistAfterInstall = await validateCLI(params);

    if (!cliExistAfterInstall) {
      throw new Error("Failed to install cycode CLI");
    }

    extensionOutput.info("CLI Installed!");
  } catch (error) {
    extensionOutput.error("Error while checking if CLI exists: " + error);
    vscode.window.showErrorMessage(TrayNotificationTexts.InstallError);
    statusBar.showCliPathError();
  }
}
