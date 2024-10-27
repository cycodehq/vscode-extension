import * as vscode from 'vscode';
import { ICliDownloadService } from './cli-download-service';
import { inject, injectable } from 'tsyringe';
import {
  CliDownloadServiceSymbol,
  CliServiceSymbol, ExtensionServiceSymbol,
  LoggerServiceSymbol,
  ScanResultsServiceSymbol,
  StateServiceSymbol,
} from '../symbols';
import { ICliService } from './cli-service';
import { ProgressOptions } from 'vscode';
import { ILoggerService } from './logger-service';
import { getScanTypeDisplayName } from '../constants';
import statusBar from '../utils/status-bar';
import { TrayNotificationTexts } from '../utils/texts';
import { captureException } from '../sentry';
import { IStateService, LocalExtensionState } from './state-service';
import { CliIgnoreType } from '../cli/models/cli-ignore-type';
import { IScanResultsService } from './scan-results-service';
import { IExtensionService } from './extension-service';
import { CliScanType } from '../cli/models/cli-scan-type';

export interface ICycodeService {
  installCliIfNeededAndCheckAuthentication(): Promise<void>;
  startAuth(): Promise<void>;
  startScan(scanType: CliScanType, paths: string[], onDemand: boolean): Promise<void>;
  startScanForCurrentProject(scanType: CliScanType): Promise<void>;
  applyDetectionIgnore(scanType: CliScanType, ignoreType: CliIgnoreType, value: string): Promise<void>;
}

type ProgressBar = vscode.Progress<{ message?: string; increment?: number }>;

@injectable()
export class CycodeService implements ICycodeService {
  private localState: LocalExtensionState;

  constructor(
    @inject(LoggerServiceSymbol) private logger: ILoggerService,
    @inject(CliDownloadServiceSymbol) private cliDownloadService: ICliDownloadService,
    @inject(CliServiceSymbol) private cliService: ICliService,
    @inject(StateServiceSymbol) private stateService: IStateService,
    @inject(ScanResultsServiceSymbol) private scanResultsService: IScanResultsService,
    @inject(ExtensionServiceSymbol) private extensionService: IExtensionService,
  ) {
    this.localState = this.stateService.localState;
  }

  private async withProgressBar(
    message: string,
    fn: (cancellationToken: vscode.CancellationToken) => Promise<void>,
    options: ProgressOptions = { cancellable: true, location: vscode.ProgressLocation.Notification },
  ): Promise<void> {
    await vscode.window.withProgress(
      options,
      async (progress: ProgressBar, cancellationToken: vscode.CancellationToken) => {
        progress.report({ message });
        try {
          statusBar.showScanningInProgress();
          await fn(cancellationToken);
          statusBar.showScanComplete();
        } catch (error: unknown) {
          captureException(error);
          if (error instanceof Error) {
            this.logger.error(`Error during progress: ${error.message}`);
          }

          statusBar.showScanError();
          vscode.window.showErrorMessage(TrayNotificationTexts.ScanError);
        } finally {
          progress.report({ increment: 100 });
        }
      });
  }

  public async installCliIfNeededAndCheckAuthentication() {
    await this.withProgressBar(
      'Cycode is loading...',
      async (cancellationToken: vscode.CancellationToken) => {
        await this.cliDownloadService.initCli();

        /*
         * required to know CLI version.
         * we don't have a universal command that will cover the auth state and CLI version yet
         */
        await this.cliService.healthCheck(cancellationToken);
        await this.cliService.checkAuth(cancellationToken);
      },
      { cancellable: false, location: vscode.ProgressLocation.Window });
  }

  public async startAuth() {
    await this.withProgressBar(
      'Authenticating to Cycode...',
      async (cancellationToken: vscode.CancellationToken) => {
        await this.cliService.doAuth(cancellationToken);
        await this.cliService.checkAuth(cancellationToken);
      });
  }

  public getScanProgressBarOptions(onDemand: boolean): ProgressOptions {
    return {
      cancellable: true,
      location: onDemand ? vscode.ProgressLocation.Notification : vscode.ProgressLocation.Window,
    };
  }

  public async startScanForCurrentProject(scanType: CliScanType) {
    const projectRoot = this.cliService.getProjectRootDirectory();
    if (!projectRoot) {
      vscode.window.showErrorMessage(
        'Cycode scans the project that is currently opened. Please open a project and try again',
      );
      return;
    }

    await this.startScan(scanType, [projectRoot], true); // onDemand = true
  }

  public async startScan(scanType: CliScanType, paths: string[], onDemand = false) {
    const scanMethods = {
      [CliScanType.Secret]: (
        token: vscode.CancellationToken,
      ) => this.cliService.scanPathsSecrets(paths, onDemand, token),
      [CliScanType.Sca]: (token: vscode.CancellationToken) => this.cliService.scanPathsSca(paths, onDemand, token),
      [CliScanType.Iac]: (token: vscode.CancellationToken) => this.cliService.scanPathsIac(paths, onDemand, token),
      [CliScanType.Sast]: (token: vscode.CancellationToken) => this.cliService.scanPathsSast(paths, onDemand, token),
    };

    const scanMethod = scanMethods[scanType];
    if (scanMethod) {
      await this.withProgressBar(
        `Cycode is scanning files for ${getScanTypeDisplayName(scanType)}...`,
        async (cancellationToken: vscode.CancellationToken) => {
          this.logger.debug(`[${scanType}] Start scanning paths: ${paths}`);
          await scanMethod(cancellationToken);
          this.logger.debug(`[${scanType}] Finish scanning paths: ${paths}`);
        },
        this.getScanProgressBarOptions(onDemand),
      );
    } else {
      this.logger.error(`Unknown scan type: ${scanType}`);
    }
  }

  private async applyDetectionIgnoreInUi(ignoreType: CliIgnoreType, value: string) {
    if (ignoreType !== CliIgnoreType.Value) {
      return;
    }

    this.scanResultsService.excludeResultsByValue(value);
    await this.extensionService.refreshProviders();
  }

  public async applyDetectionIgnore(
    scanType: CliScanType, ignoreType: CliIgnoreType, value: string,
  ) {
    await this.withProgressBar(
      'Cycode is applying ignores...',
      async (cancellationToken: vscode.CancellationToken) => {
        this.logger.debug(`[IGNORE] Start ignoring by ${ignoreType} for ${scanType}`);

        // we are removing is from UI first to show how it's blazing fast and then apply it in the background
        await this.applyDetectionIgnoreInUi(ignoreType, value);
        await this.cliService.doIgnore(scanType, ignoreType, value, cancellationToken);

        this.logger.debug(`[IGNORE] Finish ignoring by ${ignoreType} for ${scanType}`);
      },
      // we do not allow canceling this because we will instantly remove it from the UI
      { cancellable: false, location: vscode.ProgressLocation.Window },
    );
  }
}
