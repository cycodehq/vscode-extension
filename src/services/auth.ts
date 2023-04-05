import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import statusBar from "../utils/status-bar";
import { TrayNotificationTexts } from "../utils/texts";
import { validateCliCommonErrors } from "./common";
import { setContext, updateGlobalState } from "../utils/context";

export async function auth(context: vscode.ExtensionContext) {
  extensionOutput.showOutputTab();

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
    },
    async (progress) => {
      try {
        // Controls pacakge.json -> viewsWelcome
        setContext("auth.isAuthenticating", true);

        progress.report({
          message: `Authenticating with Cycode...`,
        });

        const { result, error, exitCode } = await cliWrapper.runAuth();

        setContext("auth.isAuthenticating", false);

        if (validateCliCommonErrors(error, exitCode)) {
          return;
        }

        handleAuthStatus(exitCode, result, error);
      } catch (error) {
        console.error(error);
        extensionOutput.error("Error while creating scan: " + error);
        onAuthFailed();
      }
    }
  );
}

function handleAuthStatus(exitCode: number, result: any, error: string) {
  if (exitCode === 0) {
    onAuthComplete();
    extensionOutput.info(
      "Auth completed: " + JSON.stringify({ result, error }, null, 3)
    );
  } else {
    onAuthFailed();
  }
}

export function onAuthFailed() {
  statusBar.showAuthError();
  vscode.window.showErrorMessage(TrayNotificationTexts.AuthError);
  setContext("auth.isAuthenticating", false);
  updateGlobalState("auth.isAuthed", false);
}

function onAuthComplete() {
  vscode.window.showInformationMessage(TrayNotificationTexts.AuthCompleted);

  // Hide the authenticate button
  setContext("auth.isAuthed", true);
  updateGlobalState("auth.isAuthed", true);
}
