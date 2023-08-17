export default `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Login</title>
  </head>
  <style>
    #login-container {
      display: flex;
      flex-direction: column;
    }
    #authenticate-button {
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
    <div id="login-container">
      <p>
        Cycode extension requires pre-installed
        <a
          class="styled-link"
          href="https://github.com/cycodehq-public/cycode-cli#install-cycode-cli"
          >Cycode CLI</a
        >
      </p>
      <button id="authenticate-button">Authenticate</button>

      <p>
        To learn more about how to use Cycode in VSCode
        <a
          class="styled-link"
          href="https://github.com/cycodehq-public/vscode-extension/blob/main/README.md"
          >read our docs.</a
        >
      </p>
    </div>

    <script>
      const vscode = acquireVsCodeApi();
      document
        .getElementById("authenticate-button")
        .addEventListener("click", () => {
          // Send a message to the extension code when the button is clicked
          vscode.postMessage({ command: "runAuthCommand" });
        });
    </script>
  </body>
</html>

`;
