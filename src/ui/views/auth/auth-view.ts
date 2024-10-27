import { CycodeView } from '../cycode-view';
import content from './content';

export default class AuthView extends CycodeView {
  public static readonly viewType = 'cycode.view.auth';

  constructor() {
    super(content);
  }
}
