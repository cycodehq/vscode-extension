import * as vscode from "vscode";

export default class ScanView implements vscode.WebviewViewProvider {
  public static readonly viewType = "activity_bar.scanView";
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

  private getWebviewContent() {
    return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Scan</title>
      </head>
      <style>
      #scan-container {
        display: flex;
        flex-direction: column;
      }
        #scan-vulnerabilities-button {
          background-color: #2376E5;
          color: white;
          outline: none;
          border: none;
          padding: 5px;
          box-sizing: border-box;
          cursor:pointer;
        }
        .styled-link {
          text-decoration: none;
          cursor:pointer;
        }
      </style>
      <body>
        <div id="scan-container"> 
          <p>
              Ready to scan.
              <br>
              <br>
              Open a file for editing and then hit the button:            
          </p>
          <button id="scan-vulnerabilities-button">Scan for vulnerabilities</button>
          
          <p>
            To easily scan your files, enable ScanOnSave in <a class="styled-link">settings</a> or click the Cycode status bar to scan the currently open file.
            <br>
            <br>
            To learn more about how to use Cycode in VSCode <a class="styled-link" href="https://github.com/cycodehq-public/vscode-extension">read our docs</a>.
          </p>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          document.getElementById('scan-vulnerabilities-button').addEventListener('click', () => {
            // Send a message to the extension code when the button is clicked
            vscode.postMessage({ command: 'runScanCommand' });
          });

          document.getElementById('open-cycode-settings').addEventListener('click', () => {
            // Send a message to the extension code when the button is clicked
            vscode.postMessage({ command: 'runOpenCycodeSettingsCommand' });
          });
        </script>
      </body>
      </html>`;
  }
}
