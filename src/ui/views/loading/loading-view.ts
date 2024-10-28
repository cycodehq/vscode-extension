import { CycodeView } from '../cycode-view';
import content from './content';

export default class LoadingView extends CycodeView {
  public static readonly viewType = 'cycode.view.loading';

  constructor() {
    super(content);
  }
}
