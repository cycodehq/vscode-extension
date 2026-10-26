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
import {
  DEFAULT_DIFF_FROM_REF, DEFAULT_DIFF_TO_REF, DiffScanMode, LOCAL_DIRECTORY_REF_VALUE, supportsDiffScan,
} from '../cli/constants';
import { IStateService, ScanScope } from './state-service';
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

// for a commit range `ref` is the range expression, for a local diff it's the revision compared against
interface DiffScanRequest {
  mode: DiffScanMode;
  ref: string;
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
        await this.withScanStatusBar(() => scanMethod(cancellationToken));
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
        await this.withScanStatusBar(() => this.runScanMethodsInParallel(
          scanTypes, (scanType) => this.getScanMethod(scanType, [projectRoot], true), cancellationToken,
        ));
        this.logger.debug(`[RunAll] Finish scanning paths: ${projectRoot}`);
      },
      { cancellable: true, location: vscode.ProgressLocation.Notification },
    );
  }

  /**
   * Runs diff scans for the given scan types. Scan types that can't do the requested diff mode (IaC) fall back to a
   * full project scan, and everything that can runs in parallel under a single (quiet) progress indicator.
   */
  private async runDiffScans(scanTypes: CliScanType[], request: DiffScanRequest) {
    const projectRoot = this.cliService.getProjectRootDirectory();
    if (!projectRoot) {
      vscode.window.showErrorMessage(
        'Cycode scans the project that is currently opened. Please open a project and try again',
      );
      return;
    }

    const diffScanTypes = scanTypes.filter(supportsDiffScan);
    const fallbackScanTypes = scanTypes.filter((scanType) => !supportsDiffScan(scanType));

    if (fallbackScanTypes.length) {
      this.logger.debug(
        `[Diff] ${request.mode} scans are not supported for ${fallbackScanTypes.join(', ')}, `
        + 'running full project scans instead',
      );
    }

    const fallbackFullScans = fallbackScanTypes.map((scanType) => this.startScanForCurrentProject(scanType));
    if (!diffScanTypes.length) {
      await Promise.all(fallbackFullScans);
      return;
    }

    const diffScan = this.withProgressBar(
      '',
      async (cancellationToken: vscode.CancellationToken) => {
        this.logger.debug(`[Diff] Start ${request.mode} scan of ${diffScanTypes.join(', ')}: ${request.ref}`);
        await this.withScanStatusBar(() => this.runScanMethodsInParallel(
          diffScanTypes,
          (scanType) => this.withScanRunningTracking(
            scanType,
            (token) => this.cliService.scanDiff(scanType, request.mode, request.ref, projectRoot, true, token),
          ),
          cancellationToken,
        ));
        this.logger.debug(`[Diff] Finish ${request.mode} scan of ${diffScanTypes.join(', ')}: ${request.ref}`);
      },
      { cancellable: true, location: vscode.ProgressLocation.Window },
    );

    await Promise.all([...fallbackFullScans, diffScan]);
  }

  // a scan that throws must not leave the status bar on "Waiting for scan to complete"
  private async withScanStatusBar(scan: () => Promise<void>): Promise<void> {
    statusBar.showScanningInProgress();
    try {
      await scan();
    } finally {
      statusBar.showScanComplete();
    }
  }

  private isLocalDirectoryRef(ref: string): boolean {
    return ref === LOCAL_DIRECTORY_REF_VALUE;
  }

  /** Shows an error and returns false if the two picked sides can't produce a diff. */
  private validateDiffSelectionOrNotify(fromRef: string, toRef: string): boolean {
    if (fromRef === toRef) {
      // covers both "Local directory" on both sides and the same revision on both sides
      vscode.window.showErrorMessage('Select two different revisions to compare.');
      return false;
    }

    return true;
  }

  /**
   * Maps the "from" / "to" pickers to a diff scan: if one side is the uncommitted working directory that's a
   * local-diff scan against the other (committed) side; if both sides are revisions it's a commit-range scan.
   */
  private async buildDiffScanRequest(projectRoot: string, fromRef: string, toRef: string): Promise<DiffScanRequest> {
    if (this.isLocalDirectoryRef(toRef)) {
      return { mode: DiffScanMode.LocalDiff, ref: fromRef };
    }

    if (this.isLocalDirectoryRef(fromRef)) {
      return { mode: DiffScanMode.LocalDiff, ref: toRef };
    }

    return { mode: DiffScanMode.CommitRange, ref: await this.gitService.getCommitRange(projectRoot, fromRef, toRef) };
  }

  private async startDiffScansForCurrentProject(scanTypes: CliScanType[], fromRef: string, toRef: string) {
    if (!this.validateDiffSelectionOrNotify(fromRef, toRef)) {
      return;
    }

    const projectRoot = this.cliService.getProjectRootDirectory();
    if (!projectRoot) {
      vscode.window.showErrorMessage(
        'Cycode scans the project that is currently opened. Please open a project and try again',
      );
      return;
    }

    let request: DiffScanRequest;
    try {
      request = await this.buildDiffScanRequest(projectRoot, fromRef, toRef);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not compare the selected revisions.';
      this.logger.warn(`[Diff] ${message}`);
      vscode.window.showErrorMessage(message);
      return;
    }

    await this.runDiffScans(scanTypes, request);
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

  /**
   * The Diff scope needs a CLI that supports it. Until that is known (the status has not loaded yet, or could not
   * be read) it behaves like the Project scope, which is also what the Scan view shows for it in that state.
   * A CLI that is known to be too old has already had the stored scope reset to Project when its status was read.
   */
  private getEffectiveScanScope(): ScanScope {
    const { globalState, tempState } = this.stateService;
    return globalState.ScanScope === ScanScope.Diff && !tempState.IsDiffScanScopeSupported
      ? ScanScope.Project
      : globalState.ScanScope;
  }

  public async startScanForCurrentProjectByScope(scanType: CliScanType) {
    await this.startAllScansForCurrentProjectByScope([scanType]);
  }

  public async startAllScansForCurrentProjectByScope(scanTypes: CliScanType[]) {
    const scope = this.getEffectiveScanScope();

    if (scope === ScanScope.Diff) {
      await this.startDiffScansForCurrentProject(
        scanTypes, this.stateService.tempState.ScanDiffFromRef, this.stateService.tempState.ScanDiffToRef,
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
        vscode.window.showInformationMessage(
          scanTypes.length === 1
            ? `The current file is not relevant for ${getScanTypeDisplayName(scanTypes[0])} scanning.`
            : 'The current file is not relevant to any enabled scan type.',
        );
        return;
      }

      await this.withProgressBar(
        'Cycode is scanning files...',
        async (cancellationToken: vscode.CancellationToken) => {
          this.logger.debug(`[RunAll] Start scanning file: ${activeFilePath}`);
          await this.withScanStatusBar(() => this.runScanMethodsInParallel(
            relevantScanTypes, (scanType) => this.getScanMethod(scanType, [activeFilePath], true), cancellationToken,
          ));
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
   * Re-reads the project's git refs and pushes them (and the selected revisions) to the Scan view.
   * A selected ref that scrolled out of the recent-commits list but still resolves is kept (and listed with its
   * description); one that no longer resolves to a commit (e.g. a deleted branch) is reset to the defaults.
   */
  public async refreshDiffRefs(): Promise<void> {
    const projectRoot = this.cliService.getProjectRootDirectory();
    if (!projectRoot) {
      return;
    }

    // several triggers can overlap (activation, Diff selected, repository changes); only the latest may publish results
    const requestId = ++this.refreshDiffRefsRequestId;

    const { tempState } = this.stateService;
    const selectedRefs = [tempState.ScanDiffFromRef, tempState.ScanDiffToRef];
    const refs = await this.gitService.getAvailableRefs(
      projectRoot, selectedRefs.filter((ref) => !this.isLocalDirectoryRef(ref)),
    );

    if (requestId !== this.refreshDiffRefsRequestId) {
      return;
    }

    // an empty list means git failed, so there is nothing to validate the selection against
    const listedValues = new Set(refs.map((ref) => ref.value));
    const selectedRefsExist = !refs.length
      || selectedRefs.every((ref) => this.isLocalDirectoryRef(ref) || listedValues.has(ref));

    if (!selectedRefsExist) {
      this.logger.debug('Selected Diff revisions do not exist in this repository; resetting to defaults');
      tempState.ScanDiffFromRef = DEFAULT_DIFF_FROM_REF;
      tempState.ScanDiffToRef = DEFAULT_DIFF_TO_REF;
    }

    tempState.ActivityBar?.ScanView.postGitRefs(refs);
    tempState.ActivityBar?.ScanView.postScanScope(this.stateService);
  }
}
