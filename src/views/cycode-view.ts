import * as vscode from "vscode";
import { VscodeCommands } from "../utils/commands";
import { ExecuteCommandMessages } from "./utils";

export interface ActionCommandMapping {
  commandMessage: ExecuteCommandMessages;
  command: VscodeCommands;
}

export abstract class CycodeView implements vscode.WebviewViewProvider {
  protected _view?: vscode.WebviewView;

  private readonly htmlContent: string;
  private actionCommandMapping?: ActionCommandMapping[];

  protected constructor(htmlContent: string, actionCommandMapping?: ActionCommandMapping[]) {
    this.htmlContent = htmlContent;
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
    this._view.webview.html = this.htmlContent;

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
