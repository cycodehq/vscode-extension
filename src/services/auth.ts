import * as vscode from 'vscode';
import {cliWrapper} from '../cli-wrapper/cli-wrapper';
import {validateCliCommonErrors} from './common';
import {
  endAuthenticationProcess,
  onAuthFailure,
  onAuthSuccess,
  startAuthenticationProcess,
} from '../utils/auth';
import {CommandParams} from '../types/commands';
import {captureException} from '../sentry';
import {container} from 'tsyringe';
import {ILoggerService} from './logger-service';
import {LoggerServiceSymbol} from '../symbols';

export function auth(params: CommandParams) {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);

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
          logger.error('Error while authing: ' + error);
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
    const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);
    logger.info(
        'Auth completed: ' + JSON.stringify({result, error}, null, 3)
    );
  }
}
