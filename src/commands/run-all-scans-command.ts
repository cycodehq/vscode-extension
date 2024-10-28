import { container } from 'tsyringe';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { CliScanType } from '../cli/models/cli-scan-type';
import { getCommonCommand } from './common';

export default getCommonCommand(async () => {
  const cycodeService = container.resolve<ICycodeService>(CycodeService);

  const scanPromises = [];
  scanPromises.push(cycodeService.startScanForCurrentProject(CliScanType.Secret));
  scanPromises.push(cycodeService.startScanForCurrentProject(CliScanType.Sca));
  scanPromises.push(cycodeService.startScanForCurrentProject(CliScanType.Iac));
  scanPromises.push(cycodeService.startScanForCurrentProject(CliScanType.Sast));
  await Promise.all(scanPromises);
});
