import { ActionCommandMapping, CycodeView } from "../cycode-view";
import * as vscode from "vscode";
import { ExecuteCommandMessages } from "../utils";
import { VscodeCommands } from "../../utils/commands";

export default class ScanView extends CycodeView {
  public static readonly viewType = "activity_bar.scanView";

  constructor(extensionUri: vscode.Uri) {
    const htmlContentPath = "src/views/scan/content.html";
    const actionCommandMapping: ActionCommandMapping[] = [
      {
        command: VscodeCommands.ScanCommandId,
        commandMessage: ExecuteCommandMessages.Scan,
      },
      {
        command: VscodeCommands.OpenSettingsCommandId,
        commandMessage: ExecuteCommandMessages.OpenCycodeSettings,
      },
    ];
    super(extensionUri, htmlContentPath, actionCommandMapping);
  }
}
