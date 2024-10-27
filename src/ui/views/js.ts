export default `
<script>
const vscode = acquireVsCodeApi();
const ge = elementId => document.getElementById(elementId);

const registerButton = (buttonId, commandId, inProgressText) => {
  const ogText = ge(buttonId).innerText;

  ge(buttonId).addEventListener('click', () => {
    ge(buttonId).disabled = true;
    if (inProgressText !== undefined) {
      ge(buttonId).innerText = inProgressText;
    }
    vscode.postMessage({ command: commandId });
  });

  // not super-duper efficient to register this event listener every time, but it's fine for now
  window.addEventListener('message', event => {
    if (event.data.command === commandId && event.data.finished) {
      ge(buttonId).disabled = false;
      ge(buttonId).innerText = ogText;
    }
  });
};
</script>
`;
