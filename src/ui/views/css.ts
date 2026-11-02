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

    .scan-scope-header {
      margin-bottom: 8px;
    }
    .scan-scope-label {
      font-size: 11px;
      text-transform: uppercase;
      opacity: 0.7;
      margin-bottom: 4px;
    }
    .scan-scope-options {
      display: flex;
      gap: 4px;
    }
    .scope-option-button {
      width: auto;
      flex: 1;
      font-size: 11px;
      padding: 4px 2px;
      background-color: transparent;
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-button-border,var(--vscode-panel-border));
    }
    .scope-option-button.active {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-focusBorder);
    }
    .scan-scope-description {
      font-size: 11px;
      opacity: 0.7;
      margin-top: 4px;
    }
    .scan-diff-refs {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      margin-bottom: 8px;
    }
    .scope-diff-ref-select {
      flex: 1;
      min-width: 0;
      max-width: 100%;
      font-size: 12px;
      padding: 5px 20px 5px 6px;
      background-color: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border,var(--vscode-panel-border));
      border-radius: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .scan-diff-arrow {
      font-size: 11px;
      opacity: 0.7;
    }
    .scan-scope-tradeoff {
      font-style: italic;
      opacity: 0.6;
      margin-top: 4px;
    }
</style>
`;
