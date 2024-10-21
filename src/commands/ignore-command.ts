import { validateConfig } from '../utils/config';
import { container } from 'tsyringe';
import { CycodeServiceSymbol } from '../symbols';
import { ICycodeService } from '../services/cycode-service';
import { CliIgnoreType } from '../cli/models/cli-ignore-type';
import { CliScanType } from '../cli/models/cli-scan-type';

export default (scanType: CliScanType, ignoreType: CliIgnoreType, value: string) => {
  if (validateConfig()) {
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeServiceSymbol);
  void cycodeService.applyDetectionIgnore(scanType, ignoreType, value);
};
