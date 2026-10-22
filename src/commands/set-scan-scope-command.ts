import { container } from 'tsyringe';
import { CycodeServiceSymbol, StateServiceSymbol } from '../symbols';
import { IStateService, ScanScope, TemporaryExtensionState } from '../services/state-service';
import { ICycodeService } from '../services/cycode-service';

type DiffRefSide = keyof Pick<TemporaryExtensionState, 'ScanDiffFromRef' | 'ScanDiffToRef'>;

const postScanScope = (stateService: IStateService): void => {
  stateService.tempState.ActivityBar?.ScanView.postScanScope(stateService);
};

export const setScanScopeCommand = (scope: ScanScope) => (): void => {
  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  stateService.globalState.ScanScope = scope;
  stateService.save();
  postScanScope(stateService);

  if (scope === ScanScope.Diff) {
    void container.resolve<ICycodeService>(CycodeServiceSymbol).refreshDiffRefs();
  }
};

export const setDiffRefCommand = (side: DiffRefSide) => (ref: unknown): void => {
  if (typeof ref !== 'string' || !ref) {
    return;
  }

  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  stateService.tempState[side] = ref;
  postScanScope(stateService);
};
