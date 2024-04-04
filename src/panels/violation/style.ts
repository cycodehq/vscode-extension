export default `
<style>
  .hidden {
    display: none;
  }
  
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
  }
  
  section {
    padding: 10px;
  }
  
  body {
    line-height: 1.5;
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
