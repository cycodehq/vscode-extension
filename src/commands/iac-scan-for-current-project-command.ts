import { container } from 'tsyringe';
import { validateConfig } from '../utils/config';
import { ScanType } from '../constants';
import { CycodeService, ICycodeService } from '../services/cycode-service';

export default () => {
  if (validateConfig()) {
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeService);
  void cycodeService.startScanForCurrentProject(ScanType.Iac);
};
