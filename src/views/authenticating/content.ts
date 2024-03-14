export default `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Authenticating</title>
  </head>
  <style>
    #authenticating-container {
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
    <div id="authenticating-container">
      <p>
        Cycode extension requires pre-installed
        <a
          class="styled-link"
          href="https://github.com/cycodehq/cycode-cli#install-cycode-cli"
          >Cycode CLI</a
        >
      </p>
      <button>Authenticating...</button>
    </div>
  </body>
</html>
  
`;
