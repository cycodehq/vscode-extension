import * as vscode from 'vscode';
import {extensionOutput} from '../logging/extension-output';
import {cliWrapper} from '../cli-wrapper/cli-wrapper';
import {validateCliCommonErrors} from './common';
import {
  endAuthenticationProcess,
  onAuthFailure,
  onAuthSuccess,
  startAuthenticationProcess,
} from '../utils/auth/auth_common';
import {CommandParams} from '../types/commands';
import {captureException} from '../sentry';

export function auth(params: CommandParams) {
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

          const {result, stderr, exitCode} = await cliWrapper.getRunnableAuthCommand(params).getResultPromise();

          endAuthenticationProcess();

          if (validateCliCommonErrors(stderr)) {
            return;
          }

          handleAuthStatus(exitCode, result, stderr);
        } catch (error) {
          captureException(error);
          extensionOutput.error('Error while authing: ' + error);
          onAuthFailure();
        }
      }
  );
}

function handleAuthStatus(exitCode: number, result: any, error: string) {
  // TODO(MarshalX): support JSON output
  if (exitCode !== 0 || (result.data && result.data.includes('failed'))) {
    onAuthFailure();
  } else {
    onAuthSuccess();
    extensionOutput.info(
        'Auth completed: ' + JSON.stringify({result, error}, null, 3)
    );
  }
}
