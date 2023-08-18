import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import { validateCliCommonErrors } from "./common";
import { onAuthFailure, onAuthSuccess } from "../utils/auth/auth_common";
import { prettyPrintJson } from "../utils/text_formatting";
import { IConfig } from "../cli-wrapper/types";

export async function authCheck(config: IConfig): Promise<boolean> {
  extensionOutput.showOutputTab();

  const progressedTask = vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
    },
    async (progress) => {
      try {
        progress.report({
          message: `Authenticating check with Cycode...`,
        });

        const authCheckResult = await cliWrapper.runAuthCheck(config);
        const {
          error,
          exitCode,
          result: { result: isAuthenticated },
        } = authCheckResult;

        if (validateCliCommonErrors(error, exitCode)) {
          throw new Error("Failed to check auth status");
        }

        if (!isAuthenticated) {
          throw new Error("User is not authorized");
        }

        onAuthCheckSuccess();
      } catch (error) {
        const errorMessage = `Auth check failed with the following error: ${error}`;
        extensionOutput.error(prettyPrintJson({ errorMessage }));
        onAuthFailure();

        throw( error );
      }
    }
  );

  let isAuthenticated: boolean = false;
  await progressedTask.then(
    () => isAuthenticated = true,
    () => isAuthenticated = false
  );

  return isAuthenticated;
}

function onAuthCheckSuccess(): void {
  onAuthSuccess();
  const output = `Auth check completed successfully with an "authenticated" status`;
  extensionOutput.info(output);
}
