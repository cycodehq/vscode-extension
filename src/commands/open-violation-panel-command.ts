import {ScanType} from '../constants';
import {AnyDetection} from '../types/detection';
import {createAndInitPanel} from '../ui/panels/violation/violation-panel';
import {container} from 'tsyringe';
import {IExtensionService} from '../services/extension-service';
import {ExtensionServiceSymbol} from '../symbols';

export default (detectionType: ScanType, detection: AnyDetection) => {
  const extension = container.resolve<IExtensionService>(ExtensionServiceSymbol);
  createAndInitPanel(extension.extensionContext, detectionType, detection);
};

