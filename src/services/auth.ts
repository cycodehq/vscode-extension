import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import { validateCliCommonErrors } from "./common";
import { setContext } from "../utils/context";
import {
  endAuthenticationProcess,
  onAuthFailure,
  onAuthSuccess,
  startAuthenticationProcess,
} from "../utils/auth/auth_common";
import { CommandParams } from "../types/commands";

export async function auth(params: CommandParams) {
  extensionOutput.showOutputTab();

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
    },
    async (progress) => {
      try {
        // Controls pacakge.json -> viewsWelcome
        startAuthenticationProcess();

        progress.report({
          message: `Authenticating with Cycode...`,
        });

        const { result, error, exitCode } = await cliWrapper.runAuth(params);

        endAuthenticationProcess();

        if (validateCliCommonErrors(error, exitCode)) {
          return;
        }

        handleAuthStatus(exitCode, result, error);
      } catch (error) {
        extensionOutput.error("Error while creating scan: " + error);
        onAuthFailure();
      }
    }
  );
}

function handleAuthStatus(exitCode: number, result: any, error: string) {
  if (exitCode !== 0 || (result.data && result.data.includes("failed"))) {
    onAuthFailure();
  } else {
    onAuthSuccess();
    extensionOutput.info(
      "Auth completed: " + JSON.stringify({ result, error }, null, 3)
    );
  }
}
