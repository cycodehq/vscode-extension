import { CycodeView } from "../cycode-view";
import * as vscode from "vscode";
export default class ScanView extends CycodeView {
  public static readonly viewType = "activity_bar.scanView";

  constructor(extensionUri: vscode.Uri) {
    const htmlContentPath = "src/views/scan/content.html";
    super(extensionUri, htmlContentPath);
  }
}
