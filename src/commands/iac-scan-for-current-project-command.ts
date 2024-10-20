import { container } from 'tsyringe';
import { validateConfig } from '../utils/config';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { CliScanType } from '../cli/models/cli-scan-type';

export default () => {
  if (validateConfig()) {
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeService);
  void cycodeService.startScanForCurrentProject(CliScanType.Iac);
};
