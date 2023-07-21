import * as vscode from "vscode";

export default class AuthenticatingView implements vscode.WebviewViewProvider {
  public static readonly viewType = "activity_bar.authenticating";
  private _view?: vscode.WebviewView;

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
    this._view.webview.html = this.getWebviewContent();
  }

  private getWebviewContent() {
    return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Login</title>
      </head>
      <style>
        #authenticating-container {
            display: flex;
            flex-direction: column;
        }
        #authenticating-button {
          background-color: #2376E5;
          color: white;
          outline: none;
          border: none;
          padding: 5px;
          box-sizing: border-box;
          cursor:none;
        }
        .styled-link {
            text-decoration: none;
            cursor:pointer;
        }
        
      </style>
      <body>
        <div id="authenticating-container">
            <p>
                Cycode extension requires pre-installed <a class="styled-link" href="https://github.com/cycodehq-public/cycode-cli#install-cycode-cli">Cycode CLI</a>           
            </p>
            <button id="authenticating-button">Authenticating...</button>
        </div>
      </body>
      </html>`;
  }
}
