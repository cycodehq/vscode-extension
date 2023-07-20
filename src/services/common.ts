import * as vscode from "vscode";
import statusBar from "../utils/status-bar";
import { TrayNotificationTexts } from "../utils/texts";
import { getWorkspaceState, updateWorkspaceState } from "../utils/context";
import { onAuthFailure } from "../utils/auth/auth_common";

const cliBadAuthMessageId = "client id needed";
const cliBadAuthMessageSecret = "client secret needed";

export const validateCliCommonErrors = (
  error: string,
  exitCode: number
): boolean | string => {
  // Handle non command specific problems: check for missing CLI, bad auth, etc
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
    // update status bar
    onAuthFailure();

    return error;
  }
  return false;
};
