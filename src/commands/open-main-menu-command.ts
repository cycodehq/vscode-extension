import { container } from 'tsyringe';
import { IStateService } from '../services/state-service';
import { StateServiceSymbol } from '../symbols';

export default () => {
  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  stateService.localState.TreeViewIsOpen = false;
  stateService.save();
};
