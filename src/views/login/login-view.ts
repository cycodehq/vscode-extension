import { VscodeCommands } from "../../utils/commands";
import { ActionCommandMapping, CycodeView } from "../cycode-view";
import * as vscode from "vscode";
import { ExecuteCommandMessages } from "../utils";
export default class LoginView extends CycodeView {
  public static readonly viewType = "activity_bar.login";

  constructor(extensionUri: vscode.Uri) {
    const htmlContentPath = "src/views/login/content.html";
    const actionToCommandsMapping: ActionCommandMapping[] = [
      {
        command: VscodeCommands.AuthCommandId,
        commandMessage: ExecuteCommandMessages.Auth,
      },
    ];
    super(extensionUri, htmlContentPath, actionToCommandsMapping);
  }
}
