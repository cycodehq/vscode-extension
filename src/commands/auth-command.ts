import { container } from 'tsyringe';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { getCommonCommand } from './common';

export default getCommonCommand(async () => {
  const cycodeService = container.resolve<ICycodeService>(CycodeService);
  await cycodeService.startAuth();
}, false);
