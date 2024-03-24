import {ActionCommandMapping, CycodeView} from '../cycode-view';
import {ExecuteCommandMessages} from '../utils';
import {VscodeCommands} from '../../utils/commands';
import content from './content';


export default class ScanView extends CycodeView {
  public static readonly viewType = 'activity_bar.scanView';

  constructor() {
    const actionCommandMapping: ActionCommandMapping[] = [
      {
        command: VscodeCommands.SecretScanForProjectCommandId,
        commandMessage: ExecuteCommandMessages.SecretScan,
      },
      {
        command: VscodeCommands.ScaScanCommandId,
        commandMessage: ExecuteCommandMessages.ScaScan,
      },
      {
        command: VscodeCommands.IacScanForProjectCommandId,
        commandMessage: ExecuteCommandMessages.IacScan,
      },
      {
        command: VscodeCommands.OpenSettingsCommandId,
        commandMessage: ExecuteCommandMessages.OpenCycodeSettings,
      },
    ];
    super(content, actionCommandMapping);
  }
}
