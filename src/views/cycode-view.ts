import * as vscode from "vscode";
import { loadHtmlFileInContext } from "../utils/files";

export abstract class CycodeView implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private extensionUri: vscode.Uri;
  private htmlContentPath: string;

  constructor(extensionUri: vscode.Uri, htmlContentPath: string) {
    this.extensionUri = extensionUri;
    this.htmlContentPath = htmlContentPath;
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

    // Set the HTML content for the webview
    this._view.webview.html = loadHtmlFileInContext({
      extensionUri: this.extensionUri,
      path: this.htmlContentPath,
    });
  }
}
