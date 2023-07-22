import * as vscode from "vscode";
import { loadHtmlFileInContext } from "../../utils/files";
import { VscodeCommands } from "../../utils/commands";
import { ExecuteCommandMessages } from "../utils";

const htmlContentPath = "src/views/login/content.html";

export default class LoginView implements vscode.WebviewViewProvider {
  public static readonly viewType = "activity_bar.login";
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

    // Set the HTML content for the webview
    // Set the HTML content for the webview
    this._view.webview.html = loadHtmlFileInContext({
      extensionUri: this.extensionUri,
      path: htmlContentPath,
    });

    // Handle messages from the webview
    this._view.webview.onDidReceiveMessage((message) => {
      if (message.command === ExecuteCommandMessages.Auth) {
        vscode.commands.executeCommand(VscodeCommands.AuthCommandId);
      }
    });
  }
}
