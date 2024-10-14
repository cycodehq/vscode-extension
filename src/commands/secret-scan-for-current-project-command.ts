import { container } from 'tsyringe';
import { validateConfig } from '../utils/config';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { ScanType } from '../constants';

export default () => {
  if (validateConfig()) {
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeService);
  void cycodeService.startScanForCurrentProject(ScanType.Secret);
};
