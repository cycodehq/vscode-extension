import * as vscode from 'vscode';
import * as fs from 'node:fs';
import { setSentryUser } from '../sentry';
import { inject, singleton } from 'tsyringe';
import { ExtensionServiceSymbol, LoggerServiceSymbol, ScanResultsServiceSymbol, StateServiceSymbol } from '../symbols';
import { GlobalExtensionState, IStateService } from './state-service';
import { ILoggerService } from './logger-service';
import { CliWrapper } from '../cli/cli-wrapper';
import { CliResult, isCliResultError, isCliResultPanic, isCliResultSuccess } from '../cli/models/cli-result';
import { ExitCode } from '../cli/exit-code';
import { ScanResultBase } from '../cli/models/scan-result/scan-result-base';
import { VersionResult } from '../cli/models/version-result';
import { CliCommands, CommandParameters } from '../cli/constants';
import { AuthCheckResult } from '../cli/models/auth-check-result';
import { AuthResult } from '../cli/models/auth-result';
import { getScanTypeDisplayName } from '../constants';
import { ClassConstructor } from 'class-transformer';
import { SecretScanResult } from '../cli/models/scan-result/secret/secret-scan-result';
import { IScanResultsService } from './scan-results-service';
import { IExtensionService } from './extension-service';
import { TrayNotificationTexts } from '../utils/texts';
import { VscodeCommands } from '../commands';
import { CancellationToken } from 'vscode';
import { ScaScanResult } from '../cli/models/scan-result/sca/sca-scan-result';
import { SastScanResult } from '../cli/models/scan-result/sast/sast-scan-result';
import { IacScanResult } from '../cli/models/scan-result/iac/iac-scan-result';
import { DetectionBase } from '../cli/models/scan-result/detection-base';
import { CliIgnoreType } from '../cli/models/cli-ignore-type';
import { CliScanType } from '../cli/models/cli-scan-type';

export interface ICliService {
  getProjectRootDirectory(): string | undefined; // TODO REMOVE
  healthCheck(cancellationToken?: CancellationToken): Promise<boolean>;
  checkAuth(cancellationToken?: CancellationToken): Promise<boolean>;
  doAuth(cancellationToken?: CancellationToken): Promise<boolean>;
  doIgnore(
    scanType: CliScanType, ignoreType: CliIgnoreType, value: string, cancellationToken?: CancellationToken
  ): Promise<boolean>;
  scanPathsSecrets(paths: string[], onDemand: boolean, cancellationToken: CancellationToken | undefined): Promise<void>;
  scanPathsSca(paths: string[], onDemand: boolean, cancellationToken: CancellationToken | undefined): Promise<void>;
  scanPathsIac(paths: string[], onDemand: boolean, cancellationToken: CancellationToken | undefined): Promise<void>;
  scanPathsSast(paths: string[], onDemand: boolean, cancellationToken: CancellationToken | undefined): Promise<void>;
}

@singleton()
export class CliService implements ICliService {
  private state: GlobalExtensionState;
  private cli: CliWrapper;

  constructor(@inject(StateServiceSymbol) private stateService: IStateService,
    @inject(LoggerServiceSymbol) private logger: ILoggerService,
    @inject(ScanResultsServiceSymbol) private scanResultsService: IScanResultsService,
    @inject(ExtensionServiceSymbol) private extensionService: IExtensionService,
  ) {
    this.state = this.stateService.globalState;
    this.cli = new CliWrapper(this.getProjectRootDirectory());
  }

  public getProjectRootDirectory(): string | undefined {
    /*
     * we assume that the first workspace folder is the project root
     * I do not see the correct approach for multi-root workspaces
     */
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  private resetPluginCLiState() {
    this.state.CliInstalled = false;
    this.state.CliVer = null;
    this.stateService.save();
  }

  private showErrorNotification(message: string) {
    this.logger.error(message);
    vscode.window.showErrorMessage(message);
  }

  private processCliResult<T>(result: CliResult<T>): CliResult<T> | null {
    if (isCliResultError(result)) {
      this.logger.error(result.result.message);
      this.showErrorNotification(result.result.message);
      return null;
    }

    if (isCliResultPanic(result)) {
      if (result.exitCode === ExitCode.TERMINATION) {
        // don't notify user about user-requested terminations
        return null;
      }

      this.logger.error(result.errorMessage);
      this.showErrorNotification(result.errorMessage);
      return null;
    }

    if (isCliResultSuccess(result) && result.result instanceof ScanResultBase) {
      const errors = result.result.errors;
      if (!errors.length) {
        return result;
      }

      errors.forEach((error) => {
        this.logger.error(error.message);
        this.showErrorNotification(error.message);
      });

      // we trust that it is not possible to have both errors and detections
      return null;
    }

    return result;
  }

  private async processCliScanResult(
    scanType: CliScanType, detections: DetectionBase[], onDemand: boolean,
  ): Promise<void> {
    this.scanResultsService.setDetections(scanType, detections);
    await this.extensionService.refreshProviders(scanType);
    this.showScanResultsNotification(scanType, detections.length, onDemand);
  }

  public async healthCheck(cancellationToken?: CancellationToken): Promise<boolean> {
    const result = await this.cli.executeCommand(
      VersionResult, [CliCommands.Version], cancellationToken,
    );
    const processedResult = this.processCliResult(result);

    if (isCliResultSuccess<VersionResult>(processedResult)) {
      this.state.CliInstalled = true;
      this.state.CliVer = processedResult.result.version;
      this.stateService.save();
      return true;
    }

    this.resetPluginCLiState();
    return false;
  }

  public async checkAuth(cancellationToken?: CancellationToken): Promise<boolean> {
    const result = await this.cli.executeCommand(
      AuthCheckResult, [CliCommands.AuthCheck], cancellationToken,
    );
    const processedResult = this.processCliResult(result);

    if (!isCliResultSuccess<AuthCheckResult>(processedResult)) {
      this.resetPluginCLiState();
      return false;
    }

    this.state.CliInstalled = true;
    this.state.CliAuthed = processedResult.result.result;
    this.stateService.save();

    if (!this.state.CliAuthed) {
      this.showErrorNotification('You are not authenticated in Cycode. Please authenticate');
    }

    const sentryData = processedResult.result.data;
    if (sentryData) {
      setSentryUser(sentryData.userId, sentryData.tenantId);
    }

    return this.state.CliAuthed;
  }

  public async doAuth(cancellationToken?: CancellationToken): Promise<boolean> {
    const result = await this.cli.executeCommand(
      AuthResult, [CliCommands.Auth], cancellationToken,
    );
    const processedResult = this.processCliResult(result);

    if (!isCliResultSuccess<AuthResult>(processedResult)) {
      return false;
    }

    this.state.CliAuthed = processedResult.result.result;
    this.stateService.save();

    if (!this.state.CliAuthed) {
      this.showErrorNotification('Authentication failed. Please try again');
    }

    return this.state.CliAuthed;
  }

  private mapIgnoreTypeToOptionName(ignoreType: CliIgnoreType): string {
    switch (ignoreType) {
      case CliIgnoreType.Value:
        return CommandParameters.ByValue;
      case CliIgnoreType.Rule:
        return CommandParameters.ByPath;
      case CliIgnoreType.Path:
        return CommandParameters.ByRule;
      default:
        throw new Error('Invalid CliIgnoreType');
    }
  }

  public async doIgnore(
    scanType: CliScanType, ignoreType: CliIgnoreType, value: string, cancellationToken?: CancellationToken,
  ): Promise<boolean> {
    const args = [CliCommands.Ignore, '-t', scanType.toLowerCase(), this.mapIgnoreTypeToOptionName(ignoreType), value];
    const result = await this.cli.executeCommand(null, args, cancellationToken);
    const processedResult = this.processCliResult(result);
    return isCliResultSuccess<null>(processedResult);
  }

  private getCliScanOptions(scanType: CliScanType): string[] {
    const options: string[] = [];

    if (scanType !== CliScanType.Sast) {
      options.push('--sync');
    }

    if (scanType === CliScanType.Sca) {
      options.push('--no-restore');
    }

    return options;
  }

  private async scanPaths<T extends ClassConstructor<unknown>>(
    classConst: T, paths: string[], scanType: CliScanType, cancellationToken?: CancellationToken,
  ): Promise<CliResult<T> | null> {
    const isolatedPaths: string[] = paths.map((path) => `"${path}"`);
    const scanOptions = this.getCliScanOptions(scanType);
    const args = [CliCommands.Scan, '-t', scanType.toLowerCase(), ...scanOptions, CliCommands.Path, ...isolatedPaths];
    return this.processCliResult(await this.cli.executeCommand(classConst, args, cancellationToken));
  }

  private showScanResultsNotification(scanType: CliScanType, detectionsCount: number, onDemand: boolean): void {
    const scanTypeDisplayName: string = getScanTypeDisplayName(scanType);

    if (detectionsCount > 0) {
      vscode.window
        .showInformationMessage(
          `Cycode has detected ${detectionsCount} ${scanTypeDisplayName} 
          issues in your files. Check out your “Problems” tab to analyze.`,
          TrayNotificationTexts.OpenProblemsTab,
        )
        .then((buttonPressed) => {
          if (buttonPressed === TrayNotificationTexts.OpenProblemsTab) {
            vscode.commands.executeCommand(VscodeCommands.WorkbenchShowProblemsTab);
          }
        });
    } else if (onDemand) {
      vscode.window.showInformationMessage(`No ${scanTypeDisplayName} issues were found.`);
      return;
    }
  }

  public async scanPathsSecrets(
    paths: string[], onDemand = false, cancellationToken: CancellationToken | undefined = undefined,
  ): Promise<void> {
    const results = await this.scanPaths(SecretScanResult, paths, CliScanType.Secret, cancellationToken);
    if (!isCliResultSuccess<SecretScanResult>(results)) {
      this.logger.warn(`Failed to scan Secret paths: ${paths}`);
      return;
    }

    await this.processCliScanResult(CliScanType.Secret, results.result.detections, onDemand);
  }

  public async scanPathsSca(
    paths: string[], onDemand = false, cancellationToken: CancellationToken | undefined = undefined,
  ): Promise<void> {
    const results = await this.scanPaths(ScaScanResult, paths, CliScanType.Sca, cancellationToken);
    if (!isCliResultSuccess<ScaScanResult>(results)) {
      this.logger.warn(`Failed to scan SCA paths: ${paths}`);
      return;
    }

    await this.processCliScanResult(CliScanType.Sca, results.result.detections, onDemand);
  }

  public async scanPathsIac(
    paths: string[], onDemand = false, cancellationToken: CancellationToken | undefined = undefined,
  ): Promise<void> {
    const results = await this.scanPaths(IacScanResult, paths, CliScanType.Iac, cancellationToken);
    if (!isCliResultSuccess<IacScanResult>(results)) {
      this.logger.warn(`Failed to scan IaC paths: ${paths}`);
      return;
    }

    results.result.detections = results.result.detections.filter((detection) => {
      /*
       * TF plans are virtual files what is not exist in the file system
       * "file_name": "1711298252-/Users/ilyasiamionau/projects/cycode/ilya-siamionau-payloads/tfplan.tf",
       * skip such detections
       */
      return fs.existsSync(detection.detectionDetails.fileName);
    });

    await this.processCliScanResult(CliScanType.Iac, results.result.detections, onDemand);
  }

  public async scanPathsSast(
    paths: string[], onDemand = false, cancellationToken: CancellationToken | undefined = undefined,
  ): Promise<void> {
    const results = await this.scanPaths(SastScanResult, paths, CliScanType.Sast, cancellationToken);
    if (!isCliResultSuccess<SastScanResult>(results)) {
      this.logger.warn(`Failed to scan SAST paths: ${paths}`);
      return;
    }

    await this.processCliScanResult(CliScanType.Sast, results.result.detections, onDemand);
  }
}
