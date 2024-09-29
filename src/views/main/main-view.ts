import {ActionCommandMapping, CycodeView} from '../cycode-view';
import {ExecuteCommandMessages} from '../utils';
import {VscodeCommands} from '../../utils/commands';
import content from './content';


export default class MainView extends CycodeView {
  public static readonly viewType = 'cycode.view.main';

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
        command: VscodeCommands.SastScanForProjectCommandId,
        commandMessage: ExecuteCommandMessages.SastScan,
      },
      {
        command: VscodeCommands.OpenSettingsCommandId,
        commandMessage: ExecuteCommandMessages.OpenCycodeSettings,
      },
    ];
    super(content, actionCommandMapping);
  }
}
