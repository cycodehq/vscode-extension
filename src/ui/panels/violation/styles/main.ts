export default `
<style>
  section {
    padding: 10px;
  }

  section .compact-first {
    padding: 10px 10px 0 10px;
  }

  section .compact {
    padding: 0 10px 0 10px;
  }

  body {
    line-height: 1.5;
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
    padding: 4px 10px;
    text-align: center;
  }

  button:hover {
      background-color: var(--vscode-button-background);
  }

  .hidden {
    display: none;
  }

  .section-header {
    display: block;
    font-size: 1.5em;
    font-weight: bold;
  }
  
  .section-footer {
    display: flex;
    justify-content: flex-end;
    padding: 10px;
  }

  .card {
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .vscode-dark .hr {
    border-top: 1px solid rgba(255, 255, 255, 0.18);
  }

  .vscode-light .hr {
    border-top: 1px solid rgba(0, 0, 0, 0.18);
  }

  .severity {
    display: flex;
    float: left;
    flex-direction: column;
    margin: 0 1rem 0 0;
  }

  .severity-icon {
    width: 40px;
    height: 40px;
  }

  .title {
    margin-top: 0.2rem;
    margin-bottom: 1rem;
    font-size: 1.3rem;
    line-height: 1.6;
  }

  .details-item {
    display: flex;
    margin: 0.2em 0 0.2em 0;
  }

  .details-item-title {
    flex: 30%;
    opacity: 0.7;
  }

  .details-item-value {
    flex: 70%;
  }
</style>
`;
