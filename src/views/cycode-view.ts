import * as vscode from "vscode";
import { loadHtmlFileInContext } from "../utils/files";
import { VscodeCommands } from "../utils/commands";
import { ExecuteCommandMessages } from "./utils";

export interface ActionCommandMapping {
  commandMessage: ExecuteCommandMessages;
  command: VscodeCommands;
}

export abstract class CycodeView implements vscode.WebviewViewProvider {
  protected _view?: vscode.WebviewView;
  private extensionUri: vscode.Uri;
  private htmlContentPath: string;
  private actionCommandMapping?: ActionCommandMapping[];

  constructor(
    extensionUri: vscode.Uri,
    htmlContentPath: string,
    actionCommandMapping?: ActionCommandMapping[]
  ) {
    this.extensionUri = extensionUri;
    this.htmlContentPath = htmlContentPath;
    this.actionCommandMapping = actionCommandMapping;
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

    // Register onDidReceiveMessage listeners for each command
    this.actionCommandMapping?.forEach(({ commandMessage, command }) => {
      this._view?.webview.onDidReceiveMessage((message) => {
        if (message.command === commandMessage) {
          vscode.commands.executeCommand(command);
        }
      });
    });
  }
}
