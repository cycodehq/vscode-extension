import { CycodeView } from '../cycode-view';
import content from './content';

export default class MainView extends CycodeView {
  public static readonly viewType = 'cycode.view.main';

  constructor() {
    super(content);
  }
}
