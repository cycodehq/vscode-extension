import { CycodeView } from '../cycode-view';
import content from './content';

export default class ScanView extends CycodeView {
  public static readonly viewType = 'cycode.view.scan';

  constructor() {
    super(content);
  }
}
