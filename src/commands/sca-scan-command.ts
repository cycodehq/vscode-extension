import { container } from 'tsyringe';
import { ScanType } from '../constants';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { validateConfig } from '../utils/config';

export default () => {
  if (validateConfig()) {
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeService);
  void cycodeService.startScanForCurrentProject(ScanType.Sca);
};
