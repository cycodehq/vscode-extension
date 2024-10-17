import { container } from 'tsyringe';
import { ScanType } from '../constants';
import { createAndInitPanel } from '../ui/panels/violation/violation-panel';
import { IExtensionService } from '../services/extension-service';
import { ExtensionServiceSymbol } from '../symbols';
import { DetectionBase } from '../cli/models/scan-result/detection-base';

export default (detectionType: ScanType, detection: DetectionBase) => {
  const extension = container.resolve<IExtensionService>(ExtensionServiceSymbol);
  createAndInitPanel(extension.extensionContext, detectionType, detection);
};
