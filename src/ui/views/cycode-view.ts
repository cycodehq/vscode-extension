import * as vscode from 'vscode';
import { VscodeCommands } from '../../commands';

export abstract class CycodeView implements vscode.WebviewViewProvider {
  protected _view?: vscode.WebviewView;

  private readonly htmlContent: string;

  protected constructor(htmlContent: string) {
    this.htmlContent = htmlContent;
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    this.updateView();
  }

  private updateView() {
    if (!this._view) {
      return;
    }

    this._view.webview.options = { enableScripts: true };
    this._view.webview.html = this.htmlContent;
    this._view.webview.onDidReceiveMessage((message) => {
      const command = message?.command;
      if (Object.values(VscodeCommands).includes(command)) {
        // send command back after executing to unblock disabled buttons
        vscode.commands.executeCommand(command).then(
          () => this._view?.webview.postMessage({ command, finished: true, success: true }),
          () => this._view?.webview.postMessage({ command, finished: true, success: false }),
        );
      }
    });
  }
}
