import * as vscode from 'vscode';
import { ICliDownloadService } from './cli-download-service';
import { inject, injectable } from 'tsyringe';
import { CliDownloadServiceSymbol, CliServiceSymbol, LoggerServiceSymbol } from '../symbols';
import { ICliService } from './cli-service';
import { ProgressOptions } from 'vscode';
import { ILoggerService } from './logger-service';
import { getScanTypeDisplayName, ScanType } from '../constants';
import statusBar from '../utils/status-bar';
import { TrayNotificationTexts } from '../utils/texts';
import { captureException } from '../sentry';

export interface ICycodeService {
  installCliIfNeededAndCheckAuthentication(): Promise<void>;
  startAuth(): Promise<void>;
  startScan(scanType: ScanType, paths: string[], onDemand: boolean): Promise<void>;
  startScanForCurrentProject(scanType: ScanType): Promise<void>;
}

type ProgressBar = vscode.Progress<{ message?: string; increment?: number }>;

@injectable()
export class CycodeService implements ICycodeService {
  constructor(
    @inject(LoggerServiceSymbol) private logger: ILoggerService,
    @inject(CliDownloadServiceSymbol) private cliDownloadService: ICliDownloadService,
    @inject(CliServiceSymbol) private cliService: ICliService,
  ) {}

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
      });
  }

  public getScanProgressBarOptions(onDemand: boolean): ProgressOptions {
    return {
      cancellable: true,
      location: onDemand ? vscode.ProgressLocation.Notification : vscode.ProgressLocation.Window,
    };
  }

  public async startScanForCurrentProject(scanType: ScanType) {
    const projectRoot = this.cliService.getProjectRootDirectory();
    if (!projectRoot) {
      vscode.window.showErrorMessage(
        'Cycode scans the project that is currently opened. Please open a project and try again',
      );
      return;
    }

    await this.startScan(scanType, [projectRoot], true); // onDemand = true
  }

  public async startScan(scanType: ScanType, paths: string[], onDemand = false) {
    const scanMethods = {
      [ScanType.Secret]: (token: vscode.CancellationToken) => this.cliService.scanPathsSecrets(paths, onDemand, token),
      [ScanType.Sca]: (token: vscode.CancellationToken) => this.cliService.scanPathsSca(paths, onDemand, token),
      [ScanType.Iac]: (token: vscode.CancellationToken) => this.cliService.scanPathsIac(paths, onDemand, token),
      [ScanType.Sast]: (token: vscode.CancellationToken) => this.cliService.scanPathsSast(paths, onDemand, token),
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
}
