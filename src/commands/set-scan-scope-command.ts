import { container } from 'tsyringe';
import { CycodeServiceSymbol, StateServiceSymbol } from '../symbols';
import { GlobalExtensionState, IStateService, ScanScope } from '../services/state-service';
import { ICycodeService } from '../services/cycode-service';

type DiffRefSide = keyof Pick<GlobalExtensionState, 'ScanDiffFromRef' | 'ScanDiffToRef'>;

const saveAndPostScanScope = (): void => {
  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  stateService.save();
  stateService.tempState.ActivityBar?.ScanView.postScanScope(stateService.globalState);
};

export const setScanScopeCommand = (scope: ScanScope) => (): void => {
  container.resolve<IStateService>(StateServiceSymbol).globalState.ScanScope = scope;
  saveAndPostScanScope();

  if (scope === ScanScope.Diff) {
    void container.resolve<ICycodeService>(CycodeServiceSymbol).refreshDiffRefs();
  }
};

export const setDiffRefCommand = (side: DiffRefSide) => (ref: unknown): void => {
  if (typeof ref !== 'string' || !ref) {
    return;
  }

  container.resolve<IStateService>(StateServiceSymbol).globalState[side] = ref;
  saveAndPostScanScope();
};
