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
    #authenticating-button {
      background-color: var(--vscode-button-background);
      color: white;
      outline: none;
      border: none;
      padding: 5px;
      box-sizing: border-box;
      cursor: none;
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
          href="https://github.com/cycodehq-public/cycode-cli#install-cycode-cli"
          >Cycode CLI</a
        >
      </p>
      <button id="authenticating-button">Authenticating...</button>
    </div>
  </body>
</html>
  
`;
