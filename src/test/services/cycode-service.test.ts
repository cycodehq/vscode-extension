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
import { DEFAULT_DIFF_FROM_REF, DEFAULT_DIFF_TO_REF, HEAD_REF_VALUE } from '../../cli/constants';
import { registerLoggerMock } from '../helpers';

const refOption = (value: string): GitRefOption => ({ value, label: value });

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
    const logger = registerLoggerMock();
    tempState = new TemporaryExtensionState();
    saves = 0;
    postedRefs = [];
    postedScopes = 0;
    projectRoot = '/project';
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

    const gitService: IGitService = {
      getAvailableRefs: (_cwd: string, pinnedRefs: string[] = []) => {
        requestedPinnedRefs.push(pinnedRefs);
        return getAvailableRefs(pinnedRefs);
      },
    };

    service = new CycodeService(
      logger as unknown as ILoggerService,
      {} as ICliDownloadService,
      { getProjectRootDirectory: () => projectRoot } as unknown as ICliService,
      {} as IScanResultsService,
      {} as IExtensionService,
      { globalState, tempState, save: () => saves++ } as unknown as IStateService,
      gitService,
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
