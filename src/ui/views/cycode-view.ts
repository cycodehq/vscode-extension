import * as vscode from 'vscode';
import { VscodeCommands } from '../../commands';

// the only commands a webview may pass arguments to; every other command is invoked with none
const COMMANDS_ACCEPTING_ARGS: string[] = [
  VscodeCommands.SetScanDiffFromRefCommandId,
  VscodeCommands.SetScanDiffToRefCommandId,
];

export abstract class CycodeView implements vscode.WebviewViewProvider {
  protected _view?: vscode.WebviewView;
  private _messageQueue: unknown[] = [];

  private readonly htmlContent: string;

  protected constructor(htmlContent: string) {
    this.htmlContent = htmlContent;
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    this.updateView();
    this.flushMessageQueue();
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
        const args: unknown[] = COMMANDS_ACCEPTING_ARGS.includes(command) && Array.isArray(message?.args)
          ? message.args
          : [];
        // send command back after executing to unblock disabled buttons
        vscode.commands.executeCommand(command, ...args).then(
          () => this.postMessage({ command, finished: true, success: true }),
          () => this.postMessage({ command, finished: true, success: false }),
        );
      }
    });
  }

  public postMessage(message: unknown): Thenable<boolean> {
    if (!this._view) {
      this._messageQueue.push(message);
      return Promise.resolve(true);
    }

    return this._view?.webview.postMessage(message);
  }

  private flushMessageQueue(): void {
    while (this._messageQueue.length > 0) {
      this._view?.webview.postMessage(this._messageQueue.shift());
    }
  }
}
