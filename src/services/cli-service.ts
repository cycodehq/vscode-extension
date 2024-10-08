import * as vscode from 'vscode';
import {config} from '../utils/config';
import cliWrapper from '../cli-wrapper/cli-wrapper';
import statusBar from '../utils/status-bar';
import {IConfig} from '../cli-wrapper/types';
import {validateCliCommonErrors} from './common';
import {onAuthFailure} from '../utils/auth/auth-common';
import {prettyPrintJson} from '../utils/text-formatting';
import {captureException, setSentryUser} from '../sentry';
import {inject, singleton} from 'tsyringe';
import {LoggerServiceSymbol, StateServiceSymbol} from '../symbols';
import {GlobalExtensionState, IStateService} from './state-service';
import {ILoggerService} from './logger-service';

export interface ICliService {
  getProjectRootDirectory(): string;
  getDefaultParams(): ({
    config: IConfig;
    workspaceFolderPath?: string;
  });
  resetPluginCLiState(): void;
  showErrorNotification(message: string): void;
  healthCheck(): Promise<boolean>;
  checkAuth(): Promise<boolean>;
}

@singleton()
export class CliService implements ICliService {
  private state: GlobalExtensionState;

  constructor(@inject(StateServiceSymbol) private stateService: IStateService,
              @inject(LoggerServiceSymbol) private logger: ILoggerService
  ) {
    this.state = this.stateService.globalState;
  }

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
    this.state.CliInstalled = false;
    this.state.CliVer = null;
    this.stateService.save();
  }

  showErrorNotification(message: string) {
    this.logger.error(message);
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

    this.state.CliInstalled = true;
    this.state.CliVer = getVersionResult.result.version;
    this.stateService.save();

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
              result: {result: isAuthenticated, data: sentryData},
            } = authCheckResult;

            if (validateCliCommonErrors(stderr)) {
              throw new Error('Failed to check auth status');
            }

            if (!isAuthenticated) {
              throw new Error('User is not authorized');
            }

            if (sentryData) {
              const {user_id, tenant_id} = sentryData;
              setSentryUser(user_id, tenant_id);
            }

            this.state.CliInstalled = true;
            this.state.CliAuthed = true;
            this.stateService.save();

            const output = `Auth check completed successfully with an "authenticated" status`;
            this.logger.info(output);
          } catch (error) {
            captureException(error);
            this.resetPluginCLiState();

            const errorMessage = `Auth check failed with the following error: ${error}`;
            this.logger.error(prettyPrintJson({errorMessage}));
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
