import {VscodeCommands} from '../../utils/commands';
import {ActionCommandMapping, CycodeView} from '../cycode-view';
import {ExecuteCommandMessages} from '../utils';
import content from './content';


export default class LoginView extends CycodeView {
  public static readonly viewType = 'activity_bar.login';

  constructor() {
    const actionToCommandsMapping: ActionCommandMapping[] = [
      {
        command: VscodeCommands.AuthCommandId,
        commandMessage: ExecuteCommandMessages.Auth,
      },
    ];
    super(content, actionToCommandsMapping);
  }
}
