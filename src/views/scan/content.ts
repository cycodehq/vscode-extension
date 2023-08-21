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
      background-color: var(--vscode-button-background);
      color: white;
      outline: none;
      border: none;
      padding: 5px;
      box-sizing: border-box;
      cursor: pointer;
    }
    .styled-link {
      text-decoration: none;
      cursor: pointer;
    }
  </style>
  <body>
    <div id="scan-container">
      <p>
        Ready to scan.
        <br />
        <br />
        Open a file for editing and then hit the button:
      </p>
      <button id="scan-vulnerabilities-button">Scan for hardcoded secrets</button>
      <br />
      <button id="scan-package-vulnerabilities-button">Scan for package vulnerabilities</button>

      <p>
        To easily scan your files, enable ScanOnSave in
        <a id="open-cycode-settings" class="styled-link">settings</a> or click
        the Cycode status bar to scan the currently open file.
        <br />
        <br />
        To learn more about how to use Cycode in VSCode
        <a
          class="styled-link"
          href="https://github.com/cycodehq-public/vscode-extension"
          >read our docs</a
        >.
      </p>
    </div>

    <script>
      const vscode = acquireVsCodeApi();
      document
        .getElementById("scan-vulnerabilities-button")
        .addEventListener("click", () => {
          // Send a message to the extension code when the button is clicked
          vscode.postMessage({ command: "runScanCommand" });
        });
      
      document
        .getElementById("scan-package-vulnerabilities-button")
        .addEventListener("click", () => {
          // Send a message to the extension code when the button is clicked
          vscode.postMessage({ command: "runScaScanCommand" });
        });

      document
        .getElementById("open-cycode-settings")
        .addEventListener("click", () => {
          // Send a message to the extension code when the button is clicked
          vscode.postMessage({ command: "runOpenCycodeSettingsCommand" });
        });
    </script>
  </body>
</html>
`;
