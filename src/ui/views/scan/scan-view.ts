import { CycodeView } from '../cycode-view';
import content from './content';
import { SupportedModulesStatus } from '../../../cli/models/status-result';

export default class ScanView extends CycodeView {
  public static readonly viewType = 'cycode.view.scan';

  constructor() {
    super(content);
  }

  public postSupportedModules(modules: SupportedModulesStatus): void {
    const moduleStatus = {
      secretEnabled: modules.secretScanning,
      scaEnabled: modules.scaScanning,
      iacEnabled: modules.iacScanning,
      sastEnabled: modules.sastScanning,
      aiEnabled: modules.aiLargeLanguageModel,
    };
    this.postMessage({ command: 'supportedModules', modules: moduleStatus });
  }
}
