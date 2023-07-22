import { CycodeView } from "../cycode-view";
import * as vscode from "vscode";
export default class LoginView extends CycodeView {
  public static readonly viewType = "activity_bar.login";

  constructor(extensionUri: vscode.Uri) {
    const htmlContentPath = "src/views/login/content.html";
    super(extensionUri, htmlContentPath);
  }
}
