import { ActionCommandMapping, CycodeView } from "../cycode-view";
import { ExecuteCommandMessages } from "../utils";
import { VscodeCommands } from "../../utils/commands";
import content from './content';


export default class ScanView extends CycodeView {
  public static readonly viewType = "activity_bar.scanView";

  constructor() {
    const actionCommandMapping: ActionCommandMapping[] = [
      {
        command: VscodeCommands.ScanCommandId,
        commandMessage: ExecuteCommandMessages.Scan,
      },
      {
        command: VscodeCommands.ScaScanCommandId,
        commandMessage: ExecuteCommandMessages.ScaScan,
      },
      {
        command: VscodeCommands.OpenSettingsCommandId,
        commandMessage: ExecuteCommandMessages.OpenCycodeSettings,
      },
    ];
    super(content, actionCommandMapping);
  }
}
