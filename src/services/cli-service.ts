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
import { CliCommands, CommandParameters } from '../cli/constants';
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
import { StatusResult } from '../cli/models/status-result';
import { AiRemediationResult, AiRemediationResultData } from '../cli/models/ai-remediation-result';

export interface ICliService {
  getProjectRootDirectory(): string | undefined; // TODO REMOVE
  syncStatus(cancellationToken?: CancellationToken): Promise<void>;
  doAuth(cancellationToken?: CancellationToken): Promise<boolean>;
  doIgnore(
    scanType: CliScanType, ignoreType: CliIgnoreType, value: string, cancellationToken?: CancellationToken
  ): Promise<boolean>;
  scanPathsSecrets(paths: string[], onDemand: boolean, cancellationToken: CancellationToken | undefined): Promise<void>;
  scanPathsSca(paths: string[], onDemand: boolean, cancellationToken: CancellationToken | undefined): Promise<void>;
  scanPathsIac(paths: string[], onDemand: boolean, cancellationToken: CancellationToken | undefined): Promise<void>;
  scanPathsSast(paths: string[], onDemand: boolean, cancellationToken: CancellationToken | undefined): Promise<void>;
  getAiRemediation(
    detectionId: string, cancellationToken: CancellationToken | undefined
  ): Promise<AiRemediationResultData | null>;
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

  private resetPluginCLiStateIfNeeded<T>(result: CliResult<T>) {
    if (isCliResultPanic(result) && result.exitCode === ExitCode.TERMINATION) {
      // don't reset state on user-requested terminations
      return null;
    }

    this.state.CliInstalled = false;
    this.state.CliVer = null;
    this.stateService.save();
  }

  private showErrorNotification(message: string) {
    this.logger.error(message);
    vscode.window.showErrorMessage(message);
  }

  private processCliResult<T>(result: CliResult<T>): CliResult<T> | null {
    if (isCliResultPanic(result)) {
      if (result.exitCode === ExitCode.TERMINATION) {
        // don't notify user about user-requested terminations
        return null;
      }

      this.logger.error(`[processCliResult] CLI panic: ${result.errorMessage}`);
      this.showErrorNotification(result.errorMessage);
      return null;
    }

    if (isCliResultError(result)) {
      this.logger.error(`[processCliResult] CLI error: ${result.result.message}`);
      this.showErrorNotification(result.result.message);
      return null;
    }

    if (isCliResultSuccess(result) && result.result instanceof ScanResultBase) {
      const errors = result.result.errors;
      if (!errors.length) {
        this.logger.info('[processCliResult] CLI scan results success');
        return result;
      }

      this.logger.error('[processCliResult] CLI scan results success with errors');
      errors.forEach((error) => {
        this.logger.error(error.message);
        this.showErrorNotification(error.message);
      });

      // we trust that it is not possible to have both errors and detections
      return null;
    }

    this.logger.error('[processCliResult] CLI success');
    return result;
  }

  private async processCliScanResult(
    scanType: CliScanType, detections: DetectionBase[], onDemand: boolean,
  ): Promise<void> {
    this.scanResultsService.setDetections(scanType, detections);
    await this.extensionService.refreshProviders();
    this.showScanResultsNotification(scanType, detections.length, onDemand);
  }

  public async syncStatus(cancellationToken?: CancellationToken): Promise<void> {
    const result = await this.cli.executeCommand(
      StatusResult, [CliCommands.Status], cancellationToken,
    );
    const processedResult = this.processCliResult(result);

    if (!isCliResultSuccess<StatusResult>(processedResult)) {
      this.resetPluginCLiStateIfNeeded(result);
      return;
    }

    this.state.CliInstalled = true;
    this.state.CliVer = processedResult.result.version;
    this.state.CliAuthed = processedResult.result.isAuthenticated;
    this.state.IsAiLargeLanguageModelEnabled = processedResult.result.supportedModules.aiLargeLanguageModel;
    this.stateService.save();

    if (!this.state.CliAuthed) {
      this.showErrorNotification('You are not authenticated in Cycode. Please authenticate');
    } else {
      if (processedResult.result.userId && processedResult.result.tenantId) {
        setSentryUser(processedResult.result.userId, processedResult.result.tenantId);
      }
    }

    return;
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
      case CliIgnoreType.Cve:
        return CommandParameters.ByCve;
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
          this.state.EnvVsCode ? TrayNotificationTexts.OpenProblemsTab : '', // show button only in VSCode
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

  public async getAiRemediation(
    detectionId: string, cancellationToken: CancellationToken | undefined = undefined,
  ): Promise<AiRemediationResultData | null> {
    const result = await this.cli.executeCommand(
      AiRemediationResult, [CliCommands.AiRemediation, detectionId], cancellationToken,
    );
    const processedResult = this.processCliResult(result);

    if (!isCliResultSuccess<AiRemediationResult>(processedResult)) {
      this.logger.warn(`Failed to generate AI remediation for the detection ID ${detectionId}`);
      return null;
    }

    if (!processedResult.result.result || processedResult.result.data?.remediation === undefined) {
      this.logger.warn(`AI remediation result is not available for the detection ID ${detectionId}`);
      this.showErrorNotification('AI remediation is not available for this detection');
      return null;
    }

    return processedResult.result.data;
  }
}
