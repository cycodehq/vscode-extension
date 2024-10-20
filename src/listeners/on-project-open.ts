import { container } from 'tsyringe';
import { validateConfig } from '../utils/config';
import { StateServiceSymbol } from '../symbols';
import { IStateService } from '../services/state-service';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { CliScanType } from '../cli/models/cli-scan-type';

export const onProjectOpen = () => {
  /*
   * dead code
   * was disabled because of slow scanning performance
   * right now it only starts sca scan on project open
   */

  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  if (!stateService.globalState.CliAuthed) {
    return;
  }

  const scaScanOnOpen = false; // previously was extensions setting
  if (!scaScanOnOpen) {
    return;
  }

  // sca scan
  if (validateConfig()) {
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeService);
  void cycodeService.startScanForCurrentProject(CliScanType.Sca);
};
