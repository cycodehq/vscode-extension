import * as assert from 'assert';
import { CycodeService } from '../../services/cycode-service';
import { GitRefOption, IGitService } from '../../services/git-service';
import { ILoggerService } from '../../services/logger-service';
import { ICliService } from '../../services/cli-service';
import { ICliDownloadService } from '../../services/cli-download-service';
import { IScanResultsService } from '../../services/scan-results-service';
import { IExtensionService } from '../../services/extension-service';
import {
  GlobalExtensionState, IStateService, ScanScope, TemporaryExtensionState,
} from '../../services/state-service';
import { StatusResult } from '../../cli/models/status-result';
import { CliScanType } from '../../cli/models/cli-scan-type';
import {
  DEFAULT_DIFF_FROM_REF, DEFAULT_DIFF_TO_REF, DiffScanMode, HEAD_REF_VALUE, LOCAL_DIRECTORY_REF_VALUE,
} from '../../cli/constants';
import { window } from '../vscode-mock';
import { registerLoggerMock } from '../helpers';
import statusBar from '../../utils/status-bar';
import { StatusBarTexts } from '../../utils/texts';

const PROJECT_ROOT = '/project';
const ALL_SCAN_TYPES = [CliScanType.Secret, CliScanType.Sca, CliScanType.Iac, CliScanType.Sast];

const refOption = (value: string): GitRefOption => ({ value, label: value });

const createService = (
  cliService: Partial<ICliService>,
  gitService: Partial<IGitService>,
  globalState: GlobalExtensionState,
  tempState: TemporaryExtensionState,
  onSave: () => void = () => undefined,
): CycodeService => new CycodeService(
  registerLoggerMock() as unknown as ILoggerService,
  {} as ICliDownloadService,
  cliService as ICliService,
  {} as IScanResultsService,
  { treeDataProvider: { refresh: () => undefined } } as unknown as IExtensionService,
  { globalState, tempState, save: onSave } as unknown as IStateService,
  gitService as IGitService,
);

suite('state of the Diff revisions', () => {
  test('is not part of the persisted global state', () => {
    const globalState = JSON.parse(JSON.stringify(new GlobalExtensionState())) as Record<string, unknown>;

    assert.ok(!('ScanDiffFromRef' in globalState));
    assert.ok(!('ScanDiffToRef' in globalState));
    assert.ok('ScanScope' in globalState, 'the scope itself is still remembered');
  });

  test('starts as the local directory against HEAD for every session', () => {
    const tempState = new TemporaryExtensionState();

    assert.strictEqual(tempState.ScanDiffFromRef, DEFAULT_DIFF_FROM_REF);
    assert.strictEqual(tempState.ScanDiffToRef, DEFAULT_DIFF_TO_REF);
    assert.strictEqual(tempState.ScanDiffToRef, HEAD_REF_VALUE);
  });
});

suite('CycodeService.refreshDiffRefs', () => {
  let tempState: TemporaryExtensionState;
  let saves: number;
  let postedRefs: GitRefOption[][];
  let postedScopes: number;
  let projectRoot: string | undefined;
  let requestedPinnedRefs: string[][];
  let getAvailableRefs: (pinnedRefs: string[]) => Promise<GitRefOption[]>;
  let service: CycodeService;

  setup(() => {
    tempState = new TemporaryExtensionState();
    saves = 0;
    postedRefs = [];
    postedScopes = 0;
    projectRoot = PROJECT_ROOT;
    requestedPinnedRefs = [];
    getAvailableRefs = () => Promise.resolve([refOption('HEAD'), refOption('main')]);

    tempState.ActivityBar = {
      ScanView: {
        postGitRefs: (refs: GitRefOption[]) => postedRefs.push(refs),
        postScanScope: () => postedScopes++,
      },
    } as unknown as TemporaryExtensionState['ActivityBar'];

    const globalState = new GlobalExtensionState();
    globalState.ScanScope = ScanScope.Diff;

    service = createService(
      { getProjectRootDirectory: () => projectRoot },
      {
        getAvailableRefs: (_cwd: string, pinnedRefs: string[] = []) => {
          requestedPinnedRefs.push(pinnedRefs);
          return getAvailableRefs(pinnedRefs);
        },
      },
      globalState,
      tempState,
      () => saves++,
    );
  });

  test('posts the refs and the scope, keeping the default selection', async () => {
    await service.refreshDiffRefs();

    assert.strictEqual(postedRefs.length, 1);
    assert.strictEqual(postedScopes, 1);
    assert.strictEqual(tempState.ScanDiffFromRef, DEFAULT_DIFF_FROM_REF);
    assert.strictEqual(tempState.ScanDiffToRef, DEFAULT_DIFF_TO_REF);
  });

  test('asks for the selected revisions to be listed, except the local directory', async () => {
    tempState.ScanDiffFromRef = 'main';

    await service.refreshDiffRefs();

    assert.deepStrictEqual(requestedPinnedRefs, [['main', HEAD_REF_VALUE]]);
  });

  test('keeps a selection that still exists', async () => {
    tempState.ScanDiffFromRef = 'main';

    await service.refreshDiffRefs();

    assert.strictEqual(tempState.ScanDiffFromRef, 'main');
  });

  test('resets a selection that no longer exists, without persisting anything', async () => {
    tempState.ScanDiffFromRef = 'deleted-branch';
    tempState.ScanDiffToRef = 'main';

    await service.refreshDiffRefs();

    assert.strictEqual(tempState.ScanDiffFromRef, DEFAULT_DIFF_FROM_REF);
    assert.strictEqual(tempState.ScanDiffToRef, DEFAULT_DIFF_TO_REF);
    assert.strictEqual(saves, 0, 'the revisions are session state, there is nothing to save');
    assert.strictEqual(postedScopes, 1, 'the view is told about the reset');
  });

  test('keeps the selection when git returned nothing, as that says nothing about it', async () => {
    getAvailableRefs = () => Promise.resolve([]);
    tempState.ScanDiffFromRef = 'main';

    await service.refreshDiffRefs();

    assert.strictEqual(tempState.ScanDiffFromRef, 'main');
  });

  test('does nothing without an open project', async () => {
    projectRoot = undefined;

    await service.refreshDiffRefs();

    assert.deepStrictEqual(requestedPinnedRefs, []);
    assert.strictEqual(postedRefs.length, 0);
  });

  test('ignores the result of a refresh that was overtaken by a newer one', async () => {
    let releaseFirst: (refs: GitRefOption[]) => void = () => undefined;
    let call = 0;
    getAvailableRefs = () => {
      call++;
      return call === 1
        ? new Promise<GitRefOption[]>((resolve) => {
          releaseFirst = resolve;
        })
        : Promise.resolve([refOption('HEAD'), refOption('newer')]);
    };

    const firstRefresh = service.refreshDiffRefs();
    await service.refreshDiffRefs();
    releaseFirst([refOption('HEAD'), refOption('older')]);
    await firstRefresh;

    assert.deepStrictEqual(postedRefs, [[refOption('HEAD'), refOption('newer')]]);
  });
});

suite('CycodeService scans by scope', () => {
  interface DiffCall {
    scanType: CliScanType;
    mode: DiffScanMode;
    ref: string;
    path: string;
  }

  let globalState: GlobalExtensionState;
  let tempState: TemporaryExtensionState;
  let diffCalls: DiffCall[];
  let projectScans: { scanType: CliScanType; paths: string[] }[];
  let errors: string[];
  let rangeError: Error | undefined;
  let isGitRepository: boolean;
  let service: CycodeService;
  const originalShowErrorMessage = window.showErrorMessage;

  const setCliVersion = (version: string) => {
    tempState.CliStatus = { version } as StatusResult;
  };

  setup(() => {
    globalState = new GlobalExtensionState();
    globalState.ScanScope = ScanScope.Diff;
    tempState = new TemporaryExtensionState();
    setCliVersion('3.25.0');
    diffCalls = [];
    projectScans = [];
    errors = [];
    rangeError = undefined;
    isGitRepository = true;
    window.showErrorMessage = (...args: unknown[]) => {
      errors.push(String(args[0]));
      return Promise.resolve(undefined);
    };

    const projectScan = (scanType: CliScanType) => (paths: string[]) => {
      projectScans.push({ scanType, paths });
      return Promise.resolve();
    };
    service = createService(
      {
        getProjectRootDirectory: () => PROJECT_ROOT,
        scanPathsSecrets: projectScan(CliScanType.Secret),
        scanPathsSca: projectScan(CliScanType.Sca),
        scanPathsIac: projectScan(CliScanType.Iac),
        scanPathsSast: projectScan(CliScanType.Sast),
        scanDiff: (scanType: CliScanType, mode: DiffScanMode, ref: string, path: string) => {
          diffCalls.push({ scanType, mode, ref, path });
          return Promise.resolve();
        },
      },
      {
        isGitRepository: () => Promise.resolve(isGitRepository),
        getCommitRange: (_cwd: string, fromRef: string, toRef: string) => {
          if (rangeError) {
            return Promise.reject(rangeError);
          }
          return Promise.resolve(`${fromRef}..${toRef}`);
        },
      },
      globalState,
      tempState,
    );
  });

  teardown(() => {
    window.showErrorMessage = originalShowErrorMessage;
  });

  const diffScanTypes = () => diffCalls.map((call) => call.scanType);

  test('compares the local directory against the revision picked on the other side', async () => {
    tempState.ScanDiffFromRef = 'main';
    tempState.ScanDiffToRef = LOCAL_DIRECTORY_REF_VALUE;
    await service.startAllScansForCurrentProjectByScope([CliScanType.Secret, CliScanType.Sca]);

    tempState.ScanDiffFromRef = LOCAL_DIRECTORY_REF_VALUE;
    tempState.ScanDiffToRef = 'feature/x';
    await service.startAllScansForCurrentProjectByScope([CliScanType.Sast]);

    assert.deepStrictEqual(diffCalls, [
      { scanType: CliScanType.Secret, mode: DiffScanMode.LocalDiff, ref: 'main', path: PROJECT_ROOT },
      { scanType: CliScanType.Sca, mode: DiffScanMode.LocalDiff, ref: 'main', path: PROJECT_ROOT },
      { scanType: CliScanType.Sast, mode: DiffScanMode.LocalDiff, ref: 'feature/x', path: PROJECT_ROOT },
    ]);
  });

  test('compares two revisions with the commit range the git service resolves for them', async () => {
    tempState.ScanDiffFromRef = 'main';
    tempState.ScanDiffToRef = 'feature/x';
    await service.startAllScansForCurrentProjectByScope([CliScanType.Secret]);

    const scans = diffCalls.map((call) => [call.mode, call.ref]);
    assert.deepStrictEqual(scans, [[DiffScanMode.CommitRange, 'main..feature/x']]);
  });

  test('starts no scan, local or ranged, in a folder that is not a git repository', async () => {
    isGitRepository = false;
    tempState.ScanDiffFromRef = 'main';
    tempState.ScanDiffToRef = LOCAL_DIRECTORY_REF_VALUE;
    await service.startAllScansForCurrentProjectByScope(ALL_SCAN_TYPES);

    assert.strictEqual(errors.length, 1);
    assert.match(errors[0], /not a git repository/);
    assert.deepStrictEqual(diffCalls, []);
    assert.deepStrictEqual(projectScans, []);
  });

  test('tells the user why no range could be built and starts no scan', async () => {
    rangeError = new Error('The two selected revisions have no common history to compare.');
    tempState.ScanDiffFromRef = 'main';
    tempState.ScanDiffToRef = 'feature/x';
    await service.startAllScansForCurrentProjectByScope(ALL_SCAN_TYPES);

    assert.deepStrictEqual(errors, ['The two selected revisions have no common history to compare.']);
    assert.deepStrictEqual(diffCalls, []);
    assert.deepStrictEqual(projectScans, []);
  });

  test('shows the scan error in the status bar when a diff scan throws, and completion when it succeeds', async () => {
    statusBar.create();
    let scanFails = true;
    service = createService(
      {
        getProjectRootDirectory: () => PROJECT_ROOT,
        scanDiff: () => (scanFails ? Promise.reject(new Error('cli crashed')) : Promise.resolve()),
      },
      {
        isGitRepository: () => Promise.resolve(true),
        getCommitRange: () => Promise.resolve('a..b'),
      },
      globalState,
      tempState,
    );

    await service.startAllScansForCurrentProjectByScope([CliScanType.Secret]).catch(() => undefined);

    assert.strictEqual(statusBar.statusBar.text, StatusBarTexts.ScanError);

    scanFails = false;
    await service.startAllScansForCurrentProjectByScope([CliScanType.Secret]);
    assert.strictEqual(statusBar.statusBar.text, StatusBarTexts.ScanComplete);
  });

  test('runs IaC as a project scan while the other scanners run as diffs', async () => {
    await service.startAllScansForCurrentProjectByScope(ALL_SCAN_TYPES);

    assert.deepStrictEqual(diffScanTypes(), [CliScanType.Secret, CliScanType.Sca, CliScanType.Sast]);
    assert.deepStrictEqual(projectScans, [{ scanType: CliScanType.Iac, paths: [PROJECT_ROOT] }]);
  });

  test('runs a lone IaC scan as a project scan', async () => {
    await service.startScanForCurrentProjectByScope(CliScanType.Iac);

    assert.deepStrictEqual(diffCalls, []);
    assert.deepStrictEqual(projectScans, [{ scanType: CliScanType.Iac, paths: [PROJECT_ROOT] }]);
  });

  test('runs a single scan type as a diff scan too', async () => {
    await service.startScanForCurrentProjectByScope(CliScanType.Secret);

    assert.deepStrictEqual(diffScanTypes(), [CliScanType.Secret]);
    assert.deepStrictEqual(projectScans, []);
  });

  test('refuses to compare a revision with itself', async () => {
    tempState.ScanDiffFromRef = 'main';
    tempState.ScanDiffToRef = 'main';
    await service.startAllScansForCurrentProjectByScope(ALL_SCAN_TYPES);

    tempState.ScanDiffFromRef = LOCAL_DIRECTORY_REF_VALUE;
    tempState.ScanDiffToRef = LOCAL_DIRECTORY_REF_VALUE;
    await service.startAllScansForCurrentProjectByScope(ALL_SCAN_TYPES);

    assert.deepStrictEqual(errors, [
      'Select two different revisions to compare.',
      'Select two different revisions to compare.',
    ]);
    assert.deepStrictEqual(diffCalls, []);
    assert.deepStrictEqual(projectScans, []);
  });

  test('behaves like the Project scope while the CLI status is not known', async () => {
    tempState = new TemporaryExtensionState();
    service = createService({
      getProjectRootDirectory: () => PROJECT_ROOT,
      scanPathsSecrets: (paths: string[]) => {
        projectScans.push({ scanType: CliScanType.Secret, paths });
        return Promise.resolve();
      },
      scanDiff: () => {
        assert.fail('a diff scan must not run');
      },
    }, {}, globalState, tempState);

    await service.startAllScansForCurrentProjectByScope([CliScanType.Secret]);

    assert.deepStrictEqual(projectScans, [{ scanType: CliScanType.Secret, paths: [PROJECT_ROOT] }]);
    assert.deepStrictEqual(errors, [], 'no misleading "CLI too old" message');
  });

  test('behaves like the Project scope for a CLI that is too old', async () => {
    setCliVersion('3.24.2.dev7');

    await service.startAllScansForCurrentProjectByScope([CliScanType.Secret]);

    assert.deepStrictEqual(diffCalls, []);
    assert.deepStrictEqual(projectScans, [{ scanType: CliScanType.Secret, paths: [PROJECT_ROOT] }]);
    assert.deepStrictEqual(errors, []);
  });

  test('does not diff when the Project scope is selected', async () => {
    globalState.ScanScope = ScanScope.Project;

    await service.startAllScansForCurrentProjectByScope([CliScanType.Secret]);

    assert.deepStrictEqual(diffCalls, []);
    assert.deepStrictEqual(projectScans, [{ scanType: CliScanType.Secret, paths: [PROJECT_ROOT] }]);
  });
});
