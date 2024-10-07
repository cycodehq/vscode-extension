import {VscodeCommands} from '../../commands';
import {ActionCommandMapping, CycodeView} from '../cycode-view';
import {ExecuteCommandMessages} from '../utils';
import content from './content';


export default class LoginView extends CycodeView {
  public static readonly viewType = 'cycode.view.login';

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
