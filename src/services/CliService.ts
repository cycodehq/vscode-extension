import * as vscode from 'vscode';
import {VscodeStates} from '../utils/states';
import {updateGlobalState} from '../utils/context';
import {config} from '../utils/config';
import cliWrapper from '../cli-wrapper/cli-wrapper';
import extensionOutput from '../logging/extension-output';
import statusBar from '../utils/status-bar';
import {IConfig} from '../cli-wrapper/types';
import {validateCliCommonErrors} from './common';
import {onAuthFailure, updateAuthState} from '../utils/auth/auth_common';
import {prettyPrintJson} from '../utils/text_formatting';

class CliService {
  getProjectRootDirectory(): string {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  }

  getDefaultParams(): ({
    config: IConfig;
    workspaceFolderPath?: string;
  }) {
    return {
      workspaceFolderPath: this.getProjectRootDirectory(),
      config,
    };
  }

  resetPluginCLiState() {
    updateGlobalState(VscodeStates.CliVersion, undefined);
    updateGlobalState(VscodeStates.CliInstalled, undefined);
  }

  showErrorNotification(message: string) {
    extensionOutput.error(message);
    vscode.window.showErrorMessage(message);
    statusBar.showCliPathError();
  }

  public async healthCheck(): Promise<boolean> {
    const getVersionResult = await cliWrapper.getRunnableGetVersionCommand(
        this.getDefaultParams()
    ).getResultPromise();

    if (getVersionResult.exitCode !== 0 ||
        !getVersionResult.result ||
        !('version' in getVersionResult.result)
    ) {
      this.resetPluginCLiState();
      this.showErrorNotification('Cycode CLI is not installed or not available');
      return false;
    }

    updateGlobalState(VscodeStates.CliInstalled, true);
    updateGlobalState(VscodeStates.CliVersion, getVersionResult.result.version);

    return true;
  }

  public async checkAuth(): Promise<boolean> {
    // TODO(MarshalX): rewrite. was moved during refactoring as is
    //  move progress bar out of this function. should be in CycodeService
    const progressedTask = vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
        },
        async (progress) => {
          try {
            progress.report({
              message: `Authenticating check with Cycode...`,
            });

            const authCheckResult = await cliWrapper
                .getRunnableAuthCheckCommand(config)
                .getResultPromise();
            const {
              stderr,
              result: {result: isAuthenticated},
            } = authCheckResult;

            if (validateCliCommonErrors(stderr)) {
              throw new Error('Failed to check auth status');
            }

            if (!isAuthenticated) {
              throw new Error('User is not authorized');
            }

            updateGlobalState(VscodeStates.CliInstalled, true);
            updateAuthState(true);

            const output = `Auth check completed successfully with an "authenticated" status`;
            extensionOutput.info(output);
          } catch (error) {
            this.resetPluginCLiState();

            const errorMessage = `Auth check failed with the following error: ${error}`;
            extensionOutput.error(prettyPrintJson({errorMessage}));
            onAuthFailure();

            throw (error);
          }
        }
    );

    let isAuthenticated = false;
    await progressedTask.then(
        () => isAuthenticated = true,
        () => isAuthenticated = false
    );

    return isAuthenticated;
  }
}

export const cliService = new CliService();
