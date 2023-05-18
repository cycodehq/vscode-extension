import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import statusBar from "../utils/status-bar";
import TrayNotifications from "../utils/TrayNotifications";
import { validateCliCommonErrors } from "./common";
import { setContext, updateGlobalState } from "../utils/context";
import { VscodeCommands } from "../utils/commands";
import { IConfig } from "../cli-wrapper/types";

export async function auth(
  context: vscode.ExtensionContext,
  params: {
    config: IConfig;
    workspaceFolderPath: string;
  }
) {
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

        const { result, error, exitCode } = await cliWrapper.runAuth(params);

        setContext("auth.isAuthenticating", false);

        if (validateCliCommonErrors(error, exitCode)) {
          return;
        }

        handleAuthStatus(exitCode, result, error);
      } catch (error) {
        extensionOutput.error("Error while creating scan: " + error);
        onAuthFailed();
      }
    }
  );
}

function handleAuthStatus(exitCode: number, result: any, error: string) {
  if (exitCode !== 0 || (result.data && result.data.includes("failed"))) {
    onAuthFailed();
  } else {
    onAuthComplete();
    extensionOutput.info(
      "Auth completed: " + JSON.stringify({ result, error }, null, 3)
    );
  }
}

export function onAuthFailed() {
  statusBar.showAuthError();
  TrayNotifications.showAuthFailed();

  setContext("auth.isAuthenticating", false);
  setContext("auth.isAuthed", false);
  updateGlobalState("auth.isAuthed", false);
}

function onAuthComplete() {
  statusBar.showDefault();
  TrayNotifications.showAuthSuccess();

  // Hide the authenticate button
  setContext("auth.isAuthed", true);
  setContext("auth.isAuthenticating", false);
  updateGlobalState("auth.isAuthed", true);
}
