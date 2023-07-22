import * as vscode from "vscode";
import * as fs from "fs";
import { loadHtmlFileInContext } from "../../utils/files";

const htmlContentPath = "src/views/scan/content.html";

export default class ScanView implements vscode.WebviewViewProvider {
  public static readonly viewType = "activity_bar.scanView";
  private _view?: vscode.WebviewView;
  private extensionUri: vscode.Uri;

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext<unknown>,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;
    this.updateView();
  }

  public updateView() {
    if (!this._view) {
      return;
    }

    this._view.webview.options = {
      // Enable scripts in the webview
      enableScripts: true,
    };

    this._view.webview.html = loadHtmlFileInContext({
      extensionUri: this.extensionUri,
      path: htmlContentPath,
    });

    // Handle messages from the webview
    this._view.webview.onDidReceiveMessage((message) => {
      if (message.command === "runScanCommand") {
        vscode.commands.executeCommand("cycode.scan");
      }
      if (message.command === "runOpenCycodeSettingsCommand") {
        vscode.commands.executeCommand("cycode.openSettings");
      }
    });
  }
}
