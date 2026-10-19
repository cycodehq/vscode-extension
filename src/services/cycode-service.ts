import * as vscode from 'vscode';
import { ICliDownloadService } from './cli-download-service';
import { inject, injectable } from 'tsyringe';
import {
  CliDownloadServiceSymbol,
  CliServiceSymbol, ExtensionServiceSymbol,
  GitServiceSymbol,
  LoggerServiceSymbol,
  ScanResultsServiceSymbol,
  StateServiceSymbol,
} from '../symbols';
import { ICliService } from './cli-service';
import { ProgressOptions } from 'vscode';
import { ILoggerService } from './logger-service';
import { getScanTypeDisplayName, isSupportedIacFile, isSupportedPackageFile } from '../constants';
import statusBar from '../utils/status-bar';
import { CliIgnoreType } from '../cli/models/cli-ignore-type';
import { IScanResultsService } from './scan-results-service';
import { IExtensionService } from './extension-service';
import { CliScanType } from '../cli/models/cli-scan-type';
import { AiRemediationResultData } from '../cli/models/ai-remediation-result';
import { MIN_CLI_VERSION_FOR_DIFF_SCAN } from '../cli/constants';
import {
  DEFAULT_DIFF_FROM_REF, DEFAULT_DIFF_TO_REF, IStateService, LOCAL_DIRECTORY_REF_VALUE, ScanScope,
} from './state-service';
import TrayNotifications from '../utils/tray-notifications';
import { getActiveFilePath } from '../utils/active-editor';
import { IGitService } from './git-service';

export interface ICycodeService {
  installCliIfNeededAndCheckAuthentication(): Promise<void>;
  startAuth(): Promise<void>;
  startScan(scanType: CliScanType, paths: string[], onDemand: boolean): Promise<void>;
  startScanForCurrentProject(scanType: CliScanType): Promise<void>;
  startAllScansForCurrentProject(scanTypes: CliScanType[]): Promise<void>;
  startScanForCurrentProjectByScope(scanType: CliScanType): Promise<void>;
  startAllScansForCurrentProjectByScope(scanTypes: CliScanType[]): Promise<void>;
  applyDetectionIgnore(scanType: CliScanType, ignoreType: CliIgnoreType, value: string): Promise<void>;
  getAiRemediation(detectionId: string): Promise<AiRemediationResultData | null>;
  refreshDiffRefs(): Promise<void>;
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
    @inject(StateServiceSymbol) private stateService: IStateService,
    @inject(GitServiceSymbol) private gitService: IGitService,
  ) {}

  private refreshDiffRefsRequestId = 0;

  private async withProgressBar<T>(
    message: string,
    fn: (cancellationToken: vscode.CancellationToken) => Promise<T>,
    options: ProgressOptions = { cancellable: true, location: vscode.ProgressLocation.Notification },
  ): Promise<T> {
    // the cast is required by tsc because the catch block returns undefined
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return vscode.window.withProgress(
      options,
      async (progress: ProgressBar, cancellationToken: vscode.CancellationToken) => {
        try {
          progress.report({ message });
          return await fn(cancellationToken);
        } catch (error: unknown) {
          if (error instanceof Error) {
            this.logger.error(`Error during progress: ${error.message}`);
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

  /**
   * Wraps a single scan-type's CLI invocation with "is this scan type running" tracking,
   * so the tree view can show a spinner for that row. Owned here (not in CliService) since
   * CycodeService already owns all other scan-lifecycle UI orchestration (progress bar, status bar).
   */
  private withScanRunningTracking(
    scanType: CliScanType,
    scan: (token: vscode.CancellationToken) => Promise<void>,
  ): (token: vscode.CancellationToken) => Promise<void> {
    return async (token: vscode.CancellationToken) => {
      this.stateService.tempState.setScanRunning(scanType, true);
      this.extensionService.treeDataProvider.refresh();
      try {
        await scan(token);
      } finally {
        this.stateService.tempState.setScanRunning(scanType, false);
        this.extensionService.treeDataProvider.refresh();
      }
    };
  }

  private getScanMethod(
    scanType: CliScanType,
    paths: string[],
    onDemand: boolean,
  ): ((token: vscode.CancellationToken) => Promise<void>) | undefined {
    const scanMethods: Record<CliScanType, (token: vscode.CancellationToken) => Promise<void>> = {
      [CliScanType.Secret]: (token) => this.cliService.scanPathsSecrets(paths, onDemand, token),
      [CliScanType.Sca]: (token) => this.cliService.scanPathsSca(paths, onDemand, token),
      [CliScanType.Iac]: (token) => this.cliService.scanPathsIac(paths, onDemand, token),
      [CliScanType.Sast]: (token) => this.cliService.scanPathsSast(paths, onDemand, token),
    };
    const scanMethod = scanMethods[scanType];
    return scanMethod && this.withScanRunningTracking(scanType, scanMethod);
  }

  private getCommitRangeScanMethod(
    scanType: CliScanType,
    commitRange: string,
    path: string,
    onDemand: boolean,
  ): ((token: vscode.CancellationToken) => Promise<void>) | undefined {
    const scanMethods: Record<CliScanType, (token: vscode.CancellationToken) => Promise<void>> = {
      [CliScanType.Secret]: (token) => this.cliService.scanCommitRangeSecrets(commitRange, path, onDemand, token),
      [CliScanType.Sca]: (token) => this.cliService.scanCommitRangeSca(commitRange, path, onDemand, token),
      [CliScanType.Iac]: (token) => this.cliService.scanCommitRangeIac(commitRange, path, onDemand, token),
      [CliScanType.Sast]: (token) => this.cliService.scanCommitRangeSast(commitRange, path, onDemand, token),
    };
    const scanMethod = scanMethods[scanType];
    return scanMethod && this.withScanRunningTracking(scanType, scanMethod);
  }

  private getLocalDiffScanMethod(
    scanType: CliScanType,
    commit: string,
    path: string,
    onDemand: boolean,
  ): ((token: vscode.CancellationToken) => Promise<void>) | undefined {
    const scanMethods: Record<CliScanType, (token: vscode.CancellationToken) => Promise<void>> = {
      [CliScanType.Secret]: (token) => this.cliService.scanLocalDiffSecrets(commit, path, onDemand, token),
      [CliScanType.Sca]: (token) => this.cliService.scanLocalDiffSca(commit, path, onDemand, token),
      [CliScanType.Iac]: (token) => this.cliService.scanLocalDiffIac(commit, path, onDemand, token),
      [CliScanType.Sast]: (token) => this.cliService.scanLocalDiffSast(commit, path, onDemand, token),
    };
    const scanMethod = scanMethods[scanType];
    return scanMethod && this.withScanRunningTracking(scanType, scanMethod);
  }

  private async runScanMethodsInParallel(
    scanTypes: CliScanType[],
    getMethod: (scanType: CliScanType) => ((token: vscode.CancellationToken) => Promise<void>) | undefined,
    cancellationToken: vscode.CancellationToken,
  ): Promise<void> {
    await Promise.all(
      scanTypes.map((scanType) => {
        const scanMethod = getMethod(scanType);
        if (!scanMethod) {
          this.logger.error(`Unknown scan type: ${scanType}`);
          return Promise.resolve();
        }
        return scanMethod(cancellationToken);
      }),
    );
  }

  public async startScan(scanType: CliScanType, paths: string[], onDemand = false) {
    const scanMethod = this.getScanMethod(scanType, paths, onDemand);
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

  public async startAllScansForCurrentProject(scanTypes: CliScanType[]) {
    const projectRoot = this.cliService.getProjectRootDirectory();
    if (!projectRoot) {
      vscode.window.showErrorMessage(
        'Cycode scans the project that is currently opened. Please open a project and try again',
      );
      return;
    }

    await this.withProgressBar(
      'Cycode is scanning files...',
      async (cancellationToken: vscode.CancellationToken) => {
        this.logger.debug(`[RunAll] Start scanning paths: ${projectRoot}`);
        statusBar.showScanningInProgress();
        await this.runScanMethodsInParallel(
          scanTypes, (scanType) => this.getScanMethod(scanType, [projectRoot], true), cancellationToken,
        );
        statusBar.showScanComplete();
        this.logger.debug(`[RunAll] Finish scanning paths: ${projectRoot}`);
      },
      { cancellable: true, location: vscode.ProgressLocation.Notification },
    );
  }

  private isScanTypeSupportedForDiff(scanType: CliScanType): boolean {
    // the CLI does not support commit-range or pre-commit (local diff) scanning for IaC
    return scanType !== CliScanType.Iac;
  }

  private async startCommitRangeScanForCurrentProject(scanType: CliScanType, commitRange: string) {
    if (!this.isScanTypeSupportedForDiff(scanType)) {
      this.logger.debug(`[${scanType}] Diff scope not supported, running a full project scan instead`);
      await this.startScanForCurrentProject(scanType);
      return;
    }

    const projectRoot = this.cliService.getProjectRootDirectory();
    if (!projectRoot) {
      vscode.window.showErrorMessage(
        'Cycode scans the project that is currently opened. Please open a project and try again',
      );
      return;
    }

    const scanMethod = this.getCommitRangeScanMethod(scanType, commitRange, projectRoot, true);
    if (!scanMethod) {
      this.logger.error(`Unknown scan type: ${scanType}`);
      return;
    }

    await this.withProgressBar(
      `Cycode is scanning changed files for ${getScanTypeDisplayName(scanType)}...`,
      async (cancellationToken: vscode.CancellationToken) => {
        this.logger.debug(`[${scanType}] Start scanning commit range: ${commitRange}`);
        statusBar.showScanningInProgress();
        await scanMethod(cancellationToken);
        statusBar.showScanComplete();
        this.logger.debug(`[${scanType}] Finish scanning commit range: ${commitRange}`);
      },
      this.getScanProgressBarOptions(true),
    );
  }

  private async startAllCommitRangeScansForCurrentProject(scanTypes: CliScanType[], commitRange: string) {
    const projectRoot = this.cliService.getProjectRootDirectory();
    if (!projectRoot) {
      vscode.window.showErrorMessage(
        'Cycode scans the project that is currently opened. Please open a project and try again',
      );
      return;
    }

    const supportedScanTypes = scanTypes.filter((scanType) => this.isScanTypeSupportedForDiff(scanType));
    const unsupportedScanTypes = scanTypes.filter((scanType) => !this.isScanTypeSupportedForDiff(scanType));

    if (unsupportedScanTypes.length) {
      this.logger.debug(
        `[RunAllCommitRange] Diff scope not supported for ${unsupportedScanTypes.join(', ')}, `
        + 'running full project scans instead',
      );
    }

    const fallbackFullScans = unsupportedScanTypes.map((scanType) => this.startScanForCurrentProject(scanType));

    if (!supportedScanTypes.length) {
      await Promise.all(fallbackFullScans);
      return;
    }

    const diffScan = this.withProgressBar(
      'Cycode is scanning changed files...',
      async (cancellationToken: vscode.CancellationToken) => {
        this.logger.debug(`[RunAllCommitRange] Start scanning commit range: ${commitRange}`);
        statusBar.showScanningInProgress();
        await this.runScanMethodsInParallel(
          supportedScanTypes,
          (scanType) => this.getCommitRangeScanMethod(scanType, commitRange, projectRoot, true),
          cancellationToken,
        );
        statusBar.showScanComplete();
        this.logger.debug(`[RunAllCommitRange] Finish scanning commit range: ${commitRange}`);
      },
      { cancellable: true, location: vscode.ProgressLocation.Notification },
    );

    await Promise.all([...fallbackFullScans, diffScan]);
  }

  private async startLocalDiffScanForCurrentProject(scanType: CliScanType, commit: string) {
    if (!this.isScanTypeSupportedForDiff(scanType)) {
      this.logger.debug(`[${scanType}] Local diff scope not supported, running a full project scan instead`);
      await this.startScanForCurrentProject(scanType);
      return;
    }

    const projectRoot = this.cliService.getProjectRootDirectory();
    if (!projectRoot) {
      vscode.window.showErrorMessage(
        'Cycode scans the project that is currently opened. Please open a project and try again',
      );
      return;
    }

    const scanMethod = this.getLocalDiffScanMethod(scanType, commit, projectRoot, true);
    if (!scanMethod) {
      this.logger.error(`Unknown scan type: ${scanType}`);
      return;
    }

    await this.withProgressBar(
      '',
      async (cancellationToken: vscode.CancellationToken) => {
        this.logger.debug(`[${scanType}] Start scanning local diff against ${commit}: ${projectRoot}`);
        statusBar.showScanningInProgress();
        await scanMethod(cancellationToken);
        statusBar.showScanComplete();
        this.logger.debug(`[${scanType}] Finish scanning local diff against ${commit}: ${projectRoot}`);
      },
      { cancellable: true, location: vscode.ProgressLocation.Window },
    );
  }

  private async startAllLocalDiffScansForCurrentProject(scanTypes: CliScanType[], commit: string) {
    const projectRoot = this.cliService.getProjectRootDirectory();
    if (!projectRoot) {
      vscode.window.showErrorMessage(
        'Cycode scans the project that is currently opened. Please open a project and try again',
      );
      return;
    }

    const supportedScanTypes = scanTypes.filter((scanType) => this.isScanTypeSupportedForDiff(scanType));
    const unsupportedScanTypes = scanTypes.filter((scanType) => !this.isScanTypeSupportedForDiff(scanType));

    if (unsupportedScanTypes.length) {
      this.logger.debug(
        `[RunAllLocalDiff] Local diff scope not supported for ${unsupportedScanTypes.join(', ')}, `
        + 'running full project scans instead',
      );
    }

    const fallbackFullScans = unsupportedScanTypes.map((scanType) => this.startScanForCurrentProject(scanType));

    if (!supportedScanTypes.length) {
      await Promise.all(fallbackFullScans);
      return;
    }

    const localDiffScan = this.withProgressBar(
      '',
      async (cancellationToken: vscode.CancellationToken) => {
        this.logger.debug(`[RunAllLocalDiff] Start scanning local diff against ${commit}: ${projectRoot}`);
        statusBar.showScanningInProgress();
        await this.runScanMethodsInParallel(
          supportedScanTypes,
          (scanType) => this.getLocalDiffScanMethod(scanType, commit, projectRoot, true),
          cancellationToken,
        );
        statusBar.showScanComplete();
        this.logger.debug(`[RunAllLocalDiff] Finish scanning local diff against ${commit}: ${projectRoot}`);
      },
      { cancellable: true, location: vscode.ProgressLocation.Window },
    );

    await Promise.all([...fallbackFullScans, localDiffScan]);
  }

  private isLocalDirectoryRef(ref: string): boolean {
    return ref === LOCAL_DIRECTORY_REF_VALUE;
  }

  /** Shows an error and returns false if the CLI is too old or the two picked sides can't produce a diff. */
  private validateDiffSelectionOrNotify(fromRef: string, toRef: string): boolean {
    if (!this.stateService.tempState.IsDiffScanScopeSupported) {
      vscode.window.showErrorMessage(
        `The Diff scan scope requires Cycode CLI v${MIN_CLI_VERSION_FOR_DIFF_SCAN} or later.`,
      );
      return false;
    }

    if (fromRef === toRef) {
      // covers both "Local directory" on both sides and the same revision on both sides
      vscode.window.showErrorMessage('Select two different revisions to compare.');
      return false;
    }

    return true;
  }

  /**
   * Dispatches a "from ref" vs "to ref" diff to the right underlying CLI command: if one side is
   * the uncommitted working directory, that's a local-diff scan against the other (committed) side;
   * if both sides are commits/branches/tags, that's a commit-range scan between them.
   */
  private async startDiffScanForCurrentProject(scanType: CliScanType, fromRef: string, toRef: string) {
    if (!this.validateDiffSelectionOrNotify(fromRef, toRef)) {
      return;
    }

    if (this.isLocalDirectoryRef(toRef)) {
      await this.startLocalDiffScanForCurrentProject(scanType, fromRef);
      return;
    }

    if (this.isLocalDirectoryRef(fromRef)) {
      await this.startLocalDiffScanForCurrentProject(scanType, toRef);
      return;
    }

    await this.startCommitRangeScanForCurrentProject(scanType, this.buildCommitRange(fromRef, toRef));
  }

  private async startAllDiffScansForCurrentProject(scanTypes: CliScanType[], fromRef: string, toRef: string) {
    if (!this.validateDiffSelectionOrNotify(fromRef, toRef)) {
      return;
    }

    if (this.isLocalDirectoryRef(toRef)) {
      await this.startAllLocalDiffScansForCurrentProject(scanTypes, fromRef);
      return;
    }

    if (this.isLocalDirectoryRef(fromRef)) {
      await this.startAllLocalDiffScansForCurrentProject(scanTypes, toRef);
      return;
    }

    await this.startAllCommitRangeScansForCurrentProject(scanTypes, this.buildCommitRange(fromRef, toRef));
  }

  /**
   * Builds a commit-range expression for two arbitrary user-picked refs. Uses three-dot ("...")
   * syntax rather than two-dot: two-dot ranges list commits reachable from the right side but not
   * the left, which is empty (and fails the scan with "no relevant files") if the refs were picked
   * in the "wrong" chronological order — three-dot is symmetric around the merge-base, so it
   * produces a meaningful diff regardless of which ref the user picked as "from" vs "to".
   */
  private buildCommitRange(fromRef: string, toRef: string): string {
    return `${fromRef}...${toRef}`;
  }

  private isScanTypeRelevantForFile(scanType: CliScanType, filePath: string): boolean {
    // Secret/SAST scan any file; SCA/IaC only apply to package manifests/lockfiles or IaC files
    if (scanType === CliScanType.Sca) {
      return isSupportedPackageFile(filePath);
    }

    if (scanType === CliScanType.Iac) {
      return isSupportedIacFile(filePath);
    }

    return true;
  }

  public async startScanForCurrentProjectByScope(scanType: CliScanType) {
    const scope = this.stateService.globalState.ScanScope;

    if (scope === ScanScope.Diff) {
      await this.startDiffScanForCurrentProject(
        scanType, this.stateService.globalState.ScanDiffFromRef, this.stateService.globalState.ScanDiffToRef,
      );
      return;
    }

    if (scope === ScanScope.File) {
      const activeFilePath = getActiveFilePath();
      if (!activeFilePath) {
        TrayNotifications.showMustBeFocusedOnFile();
        return;
      }

      if (!this.isScanTypeRelevantForFile(scanType, activeFilePath)) {
        vscode.window.showInformationMessage(
          `The current file is not relevant for ${getScanTypeDisplayName(scanType)} scanning.`,
        );
        return;
      }

      await this.startScan(scanType, [activeFilePath], true);
      return;
    }

    await this.startScanForCurrentProject(scanType);
  }

  public async startAllScansForCurrentProjectByScope(scanTypes: CliScanType[]) {
    const scope = this.stateService.globalState.ScanScope;

    if (scope === ScanScope.Diff) {
      await this.startAllDiffScansForCurrentProject(
        scanTypes, this.stateService.globalState.ScanDiffFromRef, this.stateService.globalState.ScanDiffToRef,
      );
      return;
    }

    if (scope === ScanScope.File) {
      const activeFilePath = getActiveFilePath();
      if (!activeFilePath) {
        TrayNotifications.showMustBeFocusedOnFile();
        return;
      }

      const relevantScanTypes = scanTypes.filter((scanType) => {
        const relevant = this.isScanTypeRelevantForFile(scanType, activeFilePath);
        if (!relevant) {
          this.logger.debug(`[RunAll] Skipping ${scanType}: file not relevant: ${activeFilePath}`);
        }
        return relevant;
      });

      if (!relevantScanTypes.length) {
        vscode.window.showInformationMessage('The current file is not relevant to any enabled scan type.');
        return;
      }

      await this.withProgressBar(
        'Cycode is scanning files...',
        async (cancellationToken: vscode.CancellationToken) => {
          this.logger.debug(`[RunAll] Start scanning file: ${activeFilePath}`);
          statusBar.showScanningInProgress();
          await this.runScanMethodsInParallel(
            relevantScanTypes, (scanType) => this.getScanMethod(scanType, [activeFilePath], true), cancellationToken,
          );
          statusBar.showScanComplete();
          this.logger.debug(`[RunAll] Finish scanning file: ${activeFilePath}`);
        },
        { cancellable: true, location: vscode.ProgressLocation.Notification },
      );
      return;
    }

    await this.startAllScansForCurrentProject(scanTypes);
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

  /**
   * Re-reads the project's git refs and pushes them (and the stored selection) to the Scan view.
   * The stored from/to refs live in global state, so they can belong to another repo. A stored ref that
   * scrolled out of the recent-commits list but still resolves is kept (and listed with its description);
   * one that no longer resolves to a commit here is reset to the defaults.
   */
  public async refreshDiffRefs(): Promise<void> {
    const projectRoot = this.cliService.getProjectRootDirectory();
    if (!projectRoot) {
      return;
    }

    // several triggers can overlap (activation, focus, watcher); only the latest request may publish results
    const requestId = ++this.refreshDiffRefsRequestId;

    const { globalState, tempState } = this.stateService;
    const storedRefs = [globalState.ScanDiffFromRef, globalState.ScanDiffToRef];
    const refs = await this.gitService.getAvailableRefs(
      projectRoot, storedRefs.filter((ref) => !this.isLocalDirectoryRef(ref)),
    );

    if (requestId !== this.refreshDiffRefsRequestId) {
      return;
    }

    // an empty list means git failed, so there is nothing to validate the stored selection against
    const listedValues = new Set(refs.map((ref) => ref.value));
    const storedRefsExist = !refs.length
      || storedRefs.every((ref) => this.isLocalDirectoryRef(ref) || listedValues.has(ref));

    if (!storedRefsExist) {
      this.logger.debug('Stored Diff revisions do not exist in this repository; resetting to defaults');
      globalState.ScanDiffFromRef = DEFAULT_DIFF_FROM_REF;
      globalState.ScanDiffToRef = DEFAULT_DIFF_TO_REF;
      this.stateService.save();
    }

    tempState.ActivityBar?.ScanView.postGitRefs(refs);
    tempState.ActivityBar?.ScanView.postScanScope(
      globalState.ScanScope, globalState.ScanDiffFromRef, globalState.ScanDiffToRef,
    );
  }
}
