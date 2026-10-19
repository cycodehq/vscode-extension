import * as vscode from 'vscode';
import * as fs from 'node:fs';
import { inject, singleton } from 'tsyringe';
import { ExtensionServiceSymbol, LoggerServiceSymbol, ScanResultsServiceSymbol, StateServiceSymbol } from '../symbols';
import { GlobalExtensionState, IStateService, ScanScope, TemporaryExtensionState } from './state-service';
import { ILoggerService } from './logger-service';
import { CliWrapper } from '../cli/cli-wrapper';
import { isPathInsideAnyRoot } from '../utils/path-containment';
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
import statusBar from '../utils/status-bar';
import { assertSafeRefArg } from '../utils/git-ref-arg';

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
  scanCommitRangeSecrets(
    commitRange: string, path: string, onDemand: boolean, cancellationToken: CancellationToken | undefined
  ): Promise<void>;
  scanCommitRangeSca(
    commitRange: string, path: string, onDemand: boolean, cancellationToken: CancellationToken | undefined
  ): Promise<void>;
  scanCommitRangeIac(
    commitRange: string, path: string, onDemand: boolean, cancellationToken: CancellationToken | undefined
  ): Promise<void>;
  scanCommitRangeSast(
    commitRange: string, path: string, onDemand: boolean, cancellationToken: CancellationToken | undefined
  ): Promise<void>;
  scanLocalDiffSecrets(
    commit: string, path: string, onDemand: boolean, cancellationToken: CancellationToken | undefined
  ): Promise<void>;
  scanLocalDiffSca(
    commit: string, path: string, onDemand: boolean, cancellationToken: CancellationToken | undefined
  ): Promise<void>;
  scanLocalDiffIac(
    commit: string, path: string, onDemand: boolean, cancellationToken: CancellationToken | undefined
  ): Promise<void>;
  scanLocalDiffSast(
    commit: string, path: string, onDemand: boolean, cancellationToken: CancellationToken | undefined
  ): Promise<void>;
  getAiRemediation(
    detectionId: string, cancellationToken: CancellationToken | undefined
  ): Promise<AiRemediationResultData | null>;
}

@singleton()
export class CliService implements ICliService {
  private state: GlobalExtensionState;
  private tempState: TemporaryExtensionState;
  private cli: CliWrapper;

  constructor(@inject(StateServiceSymbol) private stateService: IStateService,
    @inject(LoggerServiceSymbol) private logger: ILoggerService,
    @inject(ScanResultsServiceSymbol) private scanResultsService: IScanResultsService,
    @inject(ExtensionServiceSymbol) private extensionService: IExtensionService,
  ) {
    this.state = this.stateService.globalState;
    this.tempState = this.stateService.tempState;
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

    this.tempState.CliInstalled = false;
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

    this.logger.info('[processCliResult] CLI success');
    return result;
  }

  private async processCliScanResult(
    scanType: CliScanType, detections: DetectionBase[], scannedPaths: string[], onDemand: boolean,
  ): Promise<void> {
    /*
     * detections are used to open and read files (e.g. to get the detected value for ignoring).
     * accept only detections of the files that we asked to scan.
     * it also rejects symlinks which point outside of the scanned paths
     */
    const acceptedDetections = detections.filter((detection) => {
      return isPathInsideAnyRoot(detection.detectionDetails.getFilepath(), scannedPaths);
    });
    if (acceptedDetections.length !== detections.length) {
      this.logger.warn(
        `[processCliScanResult] Skipped ${detections.length - acceptedDetections.length} detections `
        + 'with file paths outside of the scanned paths',
      );
    }

    this.scanResultsService.setDetections(scanType, acceptedDetections);
    await this.extensionService.refreshProviders();
    this.showScanResultsNotification(scanType, acceptedDetections.length, onDemand);
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

    this.tempState.CliInstalled = true;
    this.tempState.CliAuthed = processedResult.result.isAuthenticated;
    this.tempState.CliStatus = processedResult.result;

    this.state.CliVer = processedResult.result.version;

    if (!this.tempState.IsDiffScanScopeSupported && this.state.ScanScope === ScanScope.Diff) {
      this.logger.debug('Diff scan scope requires a newer Cycode CLI version; resetting scope to Project');
      this.state.ScanScope = ScanScope.Project;
    }

    this.stateService.save();
    this.tempState.ActivityBar?.ScanView.postScanScope(
      this.state.ScanScope, this.state.ScanDiffFromRef, this.state.ScanDiffToRef,
    );

    if (!this.tempState.CliAuthed) {
      statusBar.showAuthIsRequired();
      this.showErrorNotification('You are not authenticated in Cycode. Please authenticate');
    } else {
      statusBar.showDefault();
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

    this.tempState.CliAuthed = processedResult.result.result;
    this.stateService.save();

    if (!this.tempState.CliAuthed) {
      this.showErrorNotification('Authentication failed. Please try again');
    }

    return this.tempState.CliAuthed;
  }

  private mapIgnoreTypeToOptionName(ignoreType: CliIgnoreType): string {
    switch (ignoreType) {
      case CliIgnoreType.Value:
        return CommandParameters.ByValue;
      case CliIgnoreType.Rule:
        return CommandParameters.ByRule;
      case CliIgnoreType.Path:
        return CommandParameters.ByPath;
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
    const scanOptions = this.getCliScanOptions(scanType);
    const args = [CliCommands.Scan, '-t', scanType.toLowerCase(), ...scanOptions, CliCommands.Path, ...paths];
    return this.processCliResult(await this.cli.executeCommand(classConst, args, cancellationToken));
  }

  private async scanCommitRange<T extends ClassConstructor<unknown>>(
    classConst: T, commitRange: string, path: string, scanType: CliScanType, cancellationToken?: CancellationToken,
  ): Promise<CliResult<T> | null> {
    const scanOptions = this.getCliScanOptions(scanType);
    const args = [
      CliCommands.Scan, '-t', scanType.toLowerCase(), ...scanOptions,
      CliCommands.CommitHistory, CommandParameters.CommitRange, assertSafeRefArg(commitRange), path,
    ];
    return this.processCliResult(await this.cli.executeCommand(classConst, args, cancellationToken));
  }

  /**
   * "Local diff" scanning (the IDE use case: working directory, including unstaged edits, against
   * a base ref) isn't its own CLI command - it's `pre-commit --include-unstaged --base-ref <ref>`.
   * The plain `pre-commit` command (no flags) is also what the git pre-commit hook itself runs.
   */
  private async scanLocalDiff<T extends ClassConstructor<unknown>>(
    classConst: T, commit: string, path: string, scanType: CliScanType, cancellationToken?: CancellationToken,
  ): Promise<CliResult<T> | null> {
    const scanOptions = this.getCliScanOptions(scanType);
    const args = [
      CliCommands.Scan, '-t', scanType.toLowerCase(), ...scanOptions,
      CliCommands.PreCommit, CommandParameters.IncludeUnstaged,
      CommandParameters.BaseRef, assertSafeRefArg(commit),
      CommandParameters.Path, path,
    ];
    return this.processCliResult(await this.cli.executeCommand(classConst, args, cancellationToken));
  }

  private filterOutVirtualIacFiles(detections: DetectionBase[]): DetectionBase[] {
    return detections.filter((detection) => {
      /*
       * TF plans are virtual files that do not exist in the file system
       * "file_name": "1711298252-/Users/ilyasiamionau/projects/cycode/ilya-siamionau-payloads/tfplan.tf",
       * skip such detections
       */
      return fs.existsSync(detection.detectionDetails.getFilepath());
    });
  }

  private async runScanAndProcessResults<T extends ScanResultBase>(
    scanType: CliScanType,
    onDemand: boolean,
    scannedPaths: string[],
    runScan: () => Promise<CliResult<unknown> | null>,
    postProcessDetections?: (detections: DetectionBase[]) => DetectionBase[],
  ): Promise<void> {
    const results = await runScan();
    if (!isCliResultSuccess<T>(results)) {
      this.logger.warn(`Failed to scan ${scanType}`);
      return;
    }

    const detections = postProcessDetections
      ? postProcessDetections(results.result.detections)
      : results.result.detections;

    await this.processCliScanResult(scanType, detections, scannedPaths, onDemand);
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
    paths: string[], onDemand = false, cancellationToken?: CancellationToken,
  ): Promise<void> {
    await this.runScanAndProcessResults<SecretScanResult>(
      CliScanType.Secret, onDemand, paths,
      () => this.scanPaths(SecretScanResult, paths, CliScanType.Secret, cancellationToken),
    );
  }

  public async scanCommitRangeSecrets(
    commitRange: string, path: string, onDemand = false, cancellationToken?: CancellationToken,
  ): Promise<void> {
    await this.runScanAndProcessResults<SecretScanResult>(
      CliScanType.Secret, onDemand, [path],
      () => this.scanCommitRange(SecretScanResult, commitRange, path, CliScanType.Secret, cancellationToken),
    );
  }

  public async scanLocalDiffSecrets(
    commit: string, path: string, onDemand = false, cancellationToken?: CancellationToken,
  ): Promise<void> {
    await this.runScanAndProcessResults<SecretScanResult>(
      CliScanType.Secret, onDemand, [path],
      () => this.scanLocalDiff(SecretScanResult, commit, path, CliScanType.Secret, cancellationToken),
    );
  }

  public async scanPathsSca(
    paths: string[], onDemand = false, cancellationToken?: CancellationToken,
  ): Promise<void> {
    await this.runScanAndProcessResults<ScaScanResult>(
      CliScanType.Sca, onDemand, paths,
      () => this.scanPaths(ScaScanResult, paths, CliScanType.Sca, cancellationToken),
    );
  }

  public async scanCommitRangeSca(
    commitRange: string, path: string, onDemand = false, cancellationToken?: CancellationToken,
  ): Promise<void> {
    await this.runScanAndProcessResults<ScaScanResult>(
      CliScanType.Sca, onDemand, [path],
      () => this.scanCommitRange(ScaScanResult, commitRange, path, CliScanType.Sca, cancellationToken),
    );
  }

  public async scanLocalDiffSca(
    commit: string, path: string, onDemand = false, cancellationToken?: CancellationToken,
  ): Promise<void> {
    await this.runScanAndProcessResults<ScaScanResult>(
      CliScanType.Sca, onDemand, [path],
      () => this.scanLocalDiff(ScaScanResult, commit, path, CliScanType.Sca, cancellationToken),
    );
  }

  public async scanPathsIac(
    paths: string[], onDemand = false, cancellationToken?: CancellationToken,
  ): Promise<void> {
    await this.runScanAndProcessResults<IacScanResult>(
      CliScanType.Iac, onDemand, paths,
      () => this.scanPaths(IacScanResult, paths, CliScanType.Iac, cancellationToken),
      (detections) => this.filterOutVirtualIacFiles(detections),
    );
  }

  public async scanCommitRangeIac(
    commitRange: string, path: string, onDemand = false, cancellationToken?: CancellationToken,
  ): Promise<void> {
    await this.runScanAndProcessResults<IacScanResult>(
      CliScanType.Iac, onDemand, [path],
      () => this.scanCommitRange(IacScanResult, commitRange, path, CliScanType.Iac, cancellationToken),
      (detections) => this.filterOutVirtualIacFiles(detections),
    );
  }

  public async scanLocalDiffIac(
    commit: string, path: string, onDemand = false, cancellationToken?: CancellationToken,
  ): Promise<void> {
    await this.runScanAndProcessResults<IacScanResult>(
      CliScanType.Iac, onDemand, [path],
      () => this.scanLocalDiff(IacScanResult, commit, path, CliScanType.Iac, cancellationToken),
      (detections) => this.filterOutVirtualIacFiles(detections),
    );
  }

  public async scanPathsSast(
    paths: string[], onDemand = false, cancellationToken?: CancellationToken,
  ): Promise<void> {
    await this.runScanAndProcessResults<SastScanResult>(
      CliScanType.Sast, onDemand, paths,
      () => this.scanPaths(SastScanResult, paths, CliScanType.Sast, cancellationToken),
    );
  }

  public async scanCommitRangeSast(
    commitRange: string, path: string, onDemand = false, cancellationToken?: CancellationToken,
  ): Promise<void> {
    await this.runScanAndProcessResults<SastScanResult>(
      CliScanType.Sast, onDemand, [path],
      () => this.scanCommitRange(SastScanResult, commitRange, path, CliScanType.Sast, cancellationToken),
    );
  }

  public async scanLocalDiffSast(
    commit: string, path: string, onDemand = false, cancellationToken?: CancellationToken,
  ): Promise<void> {
    await this.runScanAndProcessResults<SastScanResult>(
      CliScanType.Sast, onDemand, [path],
      () => this.scanLocalDiff(SastScanResult, commit, path, CliScanType.Sast, cancellationToken),
    );
  }

  public async getAiRemediation(
    detectionId: string, cancellationToken?: CancellationToken,
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
