import * as vscode from 'vscode';
import {extensionOutput} from '../logging/extension-output';
import {cliWrapper} from '../cli-wrapper/cli-wrapper';
import statusBar from '../utils/status-bar';
import {validateCliCommonErrors} from './common';
import {IConfig} from '../cli-wrapper/types';
import TrayNotifications from '../utils/TrayNotifications';

export function install(
    params: { workspaceFolderPath?: string; config: IConfig }
) {
  extensionOutput.showOutputTab();

  vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
      },
      async (progress) => {
        try {
          progress.report({
            message: `Install with pip3...`,
          });

          const {stderr, exitCode} = await cliWrapper.getRunnablePipInstallCommand(params).getResultPromise();

          if (validateCliCommonErrors(stderr)) {
            return;
          }

          // throw error
          if (exitCode !== 0) {
            throw new Error(stderr);
          }

          onInstallComplete();
        } catch (error) {
          extensionOutput.error('Error while installing: ' + error);
          onInstallFailed();
        }
      }
  );
}

export function onInstallFailed() {
  TrayNotifications.showInstallFailed();
}

export function onInstallComplete() {
  statusBar.showDefault();
  TrayNotifications.showInstallSuccess();
}
