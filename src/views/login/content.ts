import {getContent} from '../content-base';

const title = 'Login';

const body = `
<p>
  Cycode extension requires pre-installed
  <a
    class="styled-link"
    href="https://github.com/cycodehq/cycode-cli#install-cycode-cli"
  >Cycode CLI</a>
</p>
<button id="authenticate-button">Authenticate</button>

<p>
  To learn more about how to use Cycode in VSCode
  <a
    class="styled-link"
    href="https://github.com/cycodehq/vscode-extension/blob/main/README.md"
    >read our docs.</a>
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
`;

export default getContent(title, body);
