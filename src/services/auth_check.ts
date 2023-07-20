import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import { validateCliCommonErrors } from "./common";
import { CommandParams } from "../types/commands";
import {
  endAuthenticationProcess,
  startAuthenticationProcess,
  updateAuthState,
} from "../utils/auth/auth_common";
import { prettyPrintJson } from "../utils/text_formatting";

interface AuthCheckFailedArgs {
  exitCode: number;
  result: any;
}

interface HandleAuthStatusArgs<T> {
  exitCode: number;
  result: T;
  error: string;
}

export async function authCheck(params: CommandParams) {
  extensionOutput.showOutputTab();

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
    },
    async (progress) => {
      try {
        startAuthenticationProcess();

        progress.report({
          message: `Authenticating check with Cycode...`,
        });

        const authCheckResult = await cliWrapper.runAuthCheck(params);
        const { error, exitCode } = authCheckResult;

        endAuthenticationProcess();

        if (validateCliCommonErrors(error, exitCode)) {
          return;
        }

        handleAuthStatus(authCheckResult);
      } catch (error) {
        extensionOutput.error(`Error on a auth check: ${error}`);
      }
    }
  );
}

function handleAuthStatus<T extends object>(
  args: HandleAuthStatusArgs<T>
): void {
  const { exitCode, result, error } = args;
  isAuthCheckFailed({ exitCode, result })
    ? onDeclineAuthCheck(error)
    : onApproveAuthCheck(result);
}

function isAuthCheckFailed(args: AuthCheckFailedArgs): boolean {
  const { exitCode, result } = args;
  const { data } = result;
  return exitCode !== 0 || (data !== null && data.includes("failed"));
}

function onApproveAuthCheck(result: any): void {
  updateAuthState(true);
  const output = `Auth check completed with: ${prettyPrintJson(result)}`;
  extensionOutput.info(output);
}

function onDeclineAuthCheck(error: string): void {
  updateAuthState(false);
  const output = `Auth check completed with: ${prettyPrintJson({ error })}`;
  extensionOutput.info(output);
}
