export default `
<style>
    #container {
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
    button:disabled {
      background-color: var(--vscode-button-background);
      cursor: not-allowed;
      opacity: 0.4;
    }

    .styled-link {
      text-decoration: none;
      cursor: pointer;
    }
</style>
`;
