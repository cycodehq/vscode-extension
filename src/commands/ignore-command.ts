import { container } from 'tsyringe';
import { CycodeServiceSymbol } from '../symbols';
import { ICycodeService } from '../services/cycode-service';
import { CliIgnoreType } from '../cli/models/cli-ignore-type';
import { CliScanType } from '../cli/models/cli-scan-type';
import { getCommonCommand } from './common';

export default getCommonCommand(async (scanType: CliScanType, ignoreType: CliIgnoreType, value: string) => {
  const cycodeService = container.resolve<ICycodeService>(CycodeServiceSymbol);
  await cycodeService.applyDetectionIgnore(scanType, ignoreType, value);
});
