import { container } from 'tsyringe';
import { CycodeServiceSymbol, StateServiceSymbol } from '../symbols';
import vscode from 'vscode';
import { IStateService, ScanScope } from '../services/state-service';
import { ICycodeService } from '../services/cycode-service';

const postScanScope = (): void => {
  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  stateService.tempState.ActivityBar?.ScanView.postScanScope(
    stateService.globalState.ScanScope,
    stateService.globalState.ScanDiffFromRef,
    stateService.globalState.ScanDiffToRef,
  );
};

const setScanScopeCallback = (scope: ScanScope) => {
  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  stateService.globalState.ScanScope = scope;
  stateService.save();
  postScanScope();

  if (scope === ScanScope.Diff) {
    void container.resolve<ICycodeService>(CycodeServiceSymbol).refreshDiffRefs();
  }
};

const setScanDiffFromRefCallback = (ref: unknown) => {
  if (typeof ref !== 'string' || !ref) {
    return;
  }

  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  stateService.globalState.ScanDiffFromRef = ref;
  stateService.save();
  postScanScope();
};

const setScanDiffToRefCallback = (ref: unknown) => {
  if (typeof ref !== 'string' || !ref) {
    return;
  }

  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  stateService.globalState.ScanDiffToRef = ref;
  stateService.save();
  postScanScope();
};

export default (context: vscode.ExtensionContext): void => {
  context.subscriptions.push(
    vscode.commands.registerCommand('cycode.setScanScopeProject', () => { setScanScopeCallback(ScanScope.Project); }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('cycode.setScanScopeDiff', () => { setScanScopeCallback(ScanScope.Diff); }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('cycode.setScanScopeFile', () => { setScanScopeCallback(ScanScope.File); }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('cycode.setScanDiffFromRef', setScanDiffFromRefCallback),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('cycode.setScanDiffToRef', setScanDiffToRefCallback),
  );
};
