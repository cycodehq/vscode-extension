import { container } from 'tsyringe';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { validateConfig } from '../utils/config';
import { CliScanType } from '../cli/models/cli-scan-type';

export default () => {
  if (validateConfig()) {
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeService);
  void cycodeService.startScanForCurrentProject(CliScanType.Sca);
};
