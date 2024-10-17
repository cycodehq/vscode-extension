import { CycodeView } from '../cycode-view';
import content from './content';

export default class LoginView extends CycodeView {
  public static readonly viewType = 'cycode.view.login';

  constructor() {
    super(content);
  }
}
