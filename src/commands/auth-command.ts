import { validateConfig } from '../utils/config';
import { container } from 'tsyringe';
import { CycodeService, ICycodeService } from '../services/cycode-service';
export default () => {
  if (validateConfig()) {
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeService);
  void cycodeService.startAuth();
};
