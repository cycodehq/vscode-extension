import { CycodeView } from '../cycode-view';
import content from './content';
import { SupportedModulesStatus } from '../../../cli/models/status-result';
import { GitRefOption } from '../../../services/git-service';

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

  public postScanScope(scope: string, diffFromRef: string, diffToRef: string): void {
    this.postMessage({ command: 'scanScope', scope, diffFromRef, diffToRef });
  }

  public postGitRefs(refs: GitRefOption[]): void {
    this.postMessage({ command: 'gitRefs', refs });
  }

  public postDiffScopeSupported(supported: boolean): void {
    this.postMessage({ command: 'diffScopeSupported', supported });
  }
}
