import { CycodeView } from "../cycode-view";
import * as vscode from "vscode";
export default class AuthenticatingView extends CycodeView {
  public static readonly viewType = "activity_bar.authenticating";

  constructor(extensionUri: vscode.Uri) {
    const htmlContentPath = "src/views/authenticating/content.html";
    super(extensionUri, htmlContentPath);
  }
}
