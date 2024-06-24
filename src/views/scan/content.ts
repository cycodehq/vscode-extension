export default `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Scan</title>
  </head>
  <style>
    #scan-container {
      display: flex;
      flex-direction: column;
    }
    button {
      color: var(--vscode-button-foreground);
      background-color: var(--vscode-button-background);
      align-items: center;
      border: 1px solid var(--vscode-button-border,transparent);
      border-radius: 2px;
      box-sizing: border-box;
      cursor: pointer;
      display: flex;
      justify-content: center;
      line-height: 18px;
      padding: 4px;
      text-align: center;
      width: 100%;
    }
    .styled-link {
      text-decoration: none;
      cursor: pointer;
    }
  </style>
  <body>
    <div id="scan-container">
      <p>Ready to scan.</p>
      <button id="scan-vulnerabilities-button">Scan for hardcoded secrets</button>
      <br />
      <button id="scan-package-vulnerabilities-button">Scan for package vulnerabilities</button>
      <br />
      <button id="scan-sast-button">Scan for Code Security</button>
      <br />
      <button id="scan-iac-button">Scan for Infrastructure As Code</button>

      <p>
        To easily scan your files, enable ScanOnSave in
        <a id="open-cycode-settings" class="styled-link">settings</a> or click
        the Cycode status bar to scan the currently open file.
        <br />
        <br />
        To learn more about how to use Cycode in VSCode
        <a
          class="styled-link"
          href="https://github.com/cycodehq/vscode-extension"
          >read our docs</a
        >.
      </p>
    </div>

    <script>
      const vscode = acquireVsCodeApi();
      document
        .getElementById('scan-vulnerabilities-button')
        .addEventListener('click', () => {
          vscode.postMessage({ command: 'runSecretScanCommand' });
        });
      
      document
        .getElementById('scan-package-vulnerabilities-button')
        .addEventListener('click', () => {
          vscode.postMessage({ command: 'runScaScanCommand' });
        });

      document
        .getElementById('scan-sast-button')
        .addEventListener('click', () => {
          vscode.postMessage({ command: 'runSastScanCommand' });
        });

      document
        .getElementById('scan-iac-button')
        .addEventListener('click', () => {
          vscode.postMessage({ command: 'runIacScanCommand' });
        });

      document
        .getElementById('open-cycode-settings')
        .addEventListener('click', () => {
          vscode.postMessage({ command: 'runOpenCycodeSettingsCommand' });
        });
    </script>
  </body>
</html>
`;
