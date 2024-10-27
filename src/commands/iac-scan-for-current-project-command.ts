import { container } from 'tsyringe';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { CliScanType } from '../cli/models/cli-scan-type';
import { getCommonCommand } from './common';

export default getCommonCommand(async () => {
  const cycodeService = container.resolve<ICycodeService>(CycodeService);
  await cycodeService.startScanForCurrentProject(CliScanType.Iac);
});
