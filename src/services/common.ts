import * as vscode from "vscode";
import { VscodeCommands } from "../utils/commands";
import statusBar from "../utils/status-bar";
import { TrayNotificationTexts } from "../utils/texts";
import { onAuthFailed } from "./auth";
import { getWorkspaceState, updateWorkspaceState } from "../utils/context";

const cliBadAuthMessageId = "client id needed";
const cliBadAuthMessageSecret = "client secret needed";
const openCycodeViewText = "Open Cycode view";

export const validateCliCommonErrors = (
  error: string,
  exitCode: number
): boolean | string => {
  // Handle non command specific problems: check for missing Cli, bad auth, etc
  if (!error) {
    return false;
  }

  // Check Enoent
  if (error.includes("ENOENT")) {
    if (!getWorkspaceState("cli.notifWasShown")) {
      vscode.window.showErrorMessage(
        TrayNotificationTexts.CliNotInstalledError
      );
      updateWorkspaceState("cli.notifWasShown", true);
    }
    // update status bar
    statusBar.showCliPathError();
    return "ENOENT";
  }

  if (
    error.includes(cliBadAuthMessageId) ||
    error.includes(cliBadAuthMessageSecret)
  ) {
    vscode.window
      .showInformationMessage(
        "Bad authentication. Please authenticate with Cycode",
        openCycodeViewText
      )
      .then((item) => {
        item === openCycodeViewText &&
          vscode.commands.executeCommand(VscodeCommands.ShowCycodeView);
      });

    // update status bar
    onAuthFailed();

    return error;
  }
  return false;
};
