import { CycodeView } from '../cycode-view';
import content from './content';

export default class AuthenticatingView extends CycodeView {
  public static readonly viewType = 'cycode.view.authenticating';

  constructor() {
    super(content);
  }
}
