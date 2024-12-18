import * as vscode from 'vscode';
import { ICliDownloadService } from './cli-download-service';
import { inject, injectable } from 'tsyringe';
import {
  CliDownloadServiceSymbol,
  CliServiceSymbol, ExtensionServiceSymbol,
  LoggerServiceSymbol,
  ScanResultsServiceSymbol,
} from '../symbols';
import { ICliService } from './cli-service';
import { ProgressOptions } from 'vscode';
import { ILoggerService } from './logger-service';
import { getScanTypeDisplayName } from '../constants';
import statusBar from '../utils/status-bar';
import { captureException } from '../sentry';
import { CliIgnoreType } from '../cli/models/cli-ignore-type';
import { IScanResultsService } from './scan-results-service';
import { IExtensionService } from './extension-service';
import { CliScanType } from '../cli/models/cli-scan-type';
import { AiRemediationResultData } from '../cli/models/ai-remediation-result';

export interface ICycodeService {
  installCliIfNeededAndCheckAuthentication(): Promise<void>;
  startAuth(): Promise<void>;
  startScan(scanType: CliScanType, paths: string[], onDemand: boolean): Promise<void>;
  startScanForCurrentProject(scanType: CliScanType): Promise<void>;
  applyDetectionIgnore(scanType: CliScanType, ignoreType: CliIgnoreType, value: string): Promise<void>;
  getAiRemediation(detectionId: string): Promise<AiRemediationResultData | null>;
}

type ProgressBar = vscode.Progress<{ message?: string; increment?: number }>;

@injectable()
export class CycodeService implements ICycodeService {
  constructor(
    @inject(LoggerServiceSymbol) private logger: ILoggerService,
    @inject(CliDownloadServiceSymbol) private cliDownloadService: ICliDownloadService,
    @inject(CliServiceSymbol) private cliService: ICliService,
    @inject(ScanResultsServiceSymbol) private scanResultsService: IScanResultsService,
    @inject(ExtensionServiceSymbol) private extensionService: IExtensionService,
  ) {}

  private async withProgressBar<T>(
    message: string,
    fn: (cancellationToken: vscode.CancellationToken) => Promise<T>,
    options: ProgressOptions = { cancellable: true, location: vscode.ProgressLocation.Notification },
  ): Promise<T> {
    return vscode.window.withProgress(
      options,
      async (progress: ProgressBar, cancellationToken: vscode.CancellationToken) => {
        try {
          progress.report({ message });
          return await fn(cancellationToken);
        } catch (error: unknown) {
          captureException(error);
          if (error instanceof Error) {
            this.logger.error(`Error during progress: ${error.message}. FN: ${fn}`);
            vscode.window.showErrorMessage(`Cycode error: ${error.message}`);
          }
        } finally {
          progress.report({ increment: 100 });
        }
      }) as Promise<T>;
  }

  public async installCliIfNeededAndCheckAuthentication() {
    await this.withProgressBar(
      'Cycode is loading...',
      async (cancellationToken: vscode.CancellationToken) => {
        await this.cliDownloadService.initCli();
        await this.cliService.syncStatus(cancellationToken);
      },
      { cancellable: false, location: vscode.ProgressLocation.Window });
  }

  public async startAuth() {
    await this.withProgressBar(
      'Authenticating to Cycode...',
      async (cancellationToken: vscode.CancellationToken) => {
        await this.cliService.doAuth(cancellationToken);
        await this.cliService.syncStatus(cancellationToken);
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
    if (!scanMethod) {
      this.logger.error(`Unknown scan type: ${scanType}`);
      return;
    }

    await this.withProgressBar(
      `Cycode is scanning files for ${getScanTypeDisplayName(scanType)}...`,
      async (cancellationToken: vscode.CancellationToken) => {
        this.logger.debug(`[${scanType}] Start scanning paths: ${paths}`);
        statusBar.showScanningInProgress();
        await scanMethod(cancellationToken);
        statusBar.showScanComplete();
        this.logger.debug(`[${scanType}] Finish scanning paths: ${paths}`);
      },
      this.getScanProgressBarOptions(onDemand),
    );
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

  public async getAiRemediation(detectionId: string): Promise<AiRemediationResultData | null> {
    return await this.withProgressBar(
      'Cycode is generating AI remediation...',
      async (cancellationToken: vscode.CancellationToken) => {
        this.logger.debug(`[AI REMEDIATION] Start generating remediation for ${detectionId}`);
        const remediation = await this.cliService.getAiRemediation(detectionId, cancellationToken);
        this.logger.debug(`[AI REMEDIATION] Finish generating remediation for ${detectionId}`);
        return remediation;
      },
    );
  }
}
