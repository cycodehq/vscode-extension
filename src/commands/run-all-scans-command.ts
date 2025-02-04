import { container } from 'tsyringe';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { CliScanType } from '../cli/models/cli-scan-type';
import { getCommonCommand } from './common';
import { IStateService } from '../services/state-service';
import { StateServiceSymbol } from '../symbols';

export default getCommonCommand(async () => {
  const cycodeService = container.resolve<ICycodeService>(CycodeService);
  const stateService = container.resolve<IStateService>(StateServiceSymbol);

  const scanPromises = [];

  if (stateService.tempState.IsSecretScanningEnabled) {
    scanPromises.push(cycodeService.startScanForCurrentProject(CliScanType.Secret));
  }
  if (stateService.tempState.IsScaScanningEnabled) {
    scanPromises.push(cycodeService.startScanForCurrentProject(CliScanType.Sca));
  }
  if (stateService.tempState.IsIacScanningEnabled) {
    scanPromises.push(cycodeService.startScanForCurrentProject(CliScanType.Iac));
  }
  if (stateService.tempState.IsSastScanningEnabled) {
    scanPromises.push(cycodeService.startScanForCurrentProject(CliScanType.Sast));
  }

  await Promise.all(scanPromises);
});
