import TrayNotifications from '../utils/tray-notifications';
import { container } from 'tsyringe';
import { CycodeService, ICycodeService } from '../services/cycode-service';
import { CliScanType } from '../cli/models/cli-scan-type';
import { getCommonCommand } from './common';
import { getActiveFilePath } from '../utils/active-editor';

export default getCommonCommand(async () => {
  const activeFilePath = getActiveFilePath();
  if (!activeFilePath) {
    TrayNotifications.showMustBeFocusedOnFile();
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeService);
  await cycodeService.startScan(CliScanType.Secret, [activeFilePath], true);
});
