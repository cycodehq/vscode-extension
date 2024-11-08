import { container } from 'tsyringe';
import { createAndInitPanel } from '../ui/panels/violation/violation-panel';
import { IExtensionService } from '../services/extension-service';
import { ExtensionServiceSymbol } from '../symbols';
import { DetectionBase } from '../cli/models/scan-result/detection-base';
import { CliScanType } from '../cli/models/cli-scan-type';

export default async (scanType: CliScanType, detection: DetectionBase) => {
  const extension = container.resolve<IExtensionService>(ExtensionServiceSymbol);
  await createAndInitPanel(extension.extensionContext, scanType, detection);
};
