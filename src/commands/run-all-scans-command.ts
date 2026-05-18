import { container } from 'tsyringe';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { CliScanType } from '../cli/models/cli-scan-type';
import { getCommonCommand } from './common';
import { IStateService } from '../services/state-service';
import { StateServiceSymbol } from '../symbols';

export default getCommonCommand(async () => {
  const cycodeService = container.resolve<ICycodeService>(CycodeService);
  const stateService = container.resolve<IStateService>(StateServiceSymbol);

  const enabledScanTypes: CliScanType[] = [];

  if (stateService.tempState.IsSecretScanningEnabled) enabledScanTypes.push(CliScanType.Secret);
  if (stateService.tempState.IsScaScanningEnabled) enabledScanTypes.push(CliScanType.Sca);
  if (stateService.tempState.IsIacScanningEnabled) enabledScanTypes.push(CliScanType.Iac);
  if (stateService.tempState.IsSastScanningEnabled) enabledScanTypes.push(CliScanType.Sast);

  await cycodeService.startAllScansForCurrentProject(enabledScanTypes);
});
