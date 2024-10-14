import { getContent } from '../content-base';
import { VscodeCommands } from '../../../commands';

const title = 'Scan';

const body = `
<p>Ready to scan.</p>
<button id="scan-vulnerabilities-button">Scan for hardcoded secrets</button>
<br />
<button id="scan-package-vulnerabilities-button">Scan for package vulnerabilities</button>
<br />
<button id="scan-sast-button">Scan for Code Security</button>
<br />
<button id="scan-iac-button">Scan for Infrastructure As Code</button>

<p>
  To easily scan your files, enable Scan On Save in
  <a id="open-cycode-settings" class="styled-link">settings</a> or click
  the Cycode status bar to scan the currently open file.
  <br />
  <br />
  To learn more about how to use Cycode in VS Code
  <a
    class="styled-link"
    href="https://github.com/cycodehq/vscode-extension"
    >read our docs</a
  >.
</p>

<script>
const vscode = acquireVsCodeApi();
document
  .getElementById('scan-vulnerabilities-button')
  .addEventListener('click', () => {
    vscode.postMessage({ command: '${VscodeCommands.SecretScanForProjectCommandId}' });
  });

document
  .getElementById('scan-package-vulnerabilities-button')
  .addEventListener('click', () => {
    vscode.postMessage({ command: '${VscodeCommands.ScaScanCommandId}' });
  });

document
  .getElementById('scan-sast-button')
  .addEventListener('click', () => {
    vscode.postMessage({ command: '${VscodeCommands.SastScanForProjectCommandId}' });
  });

document
  .getElementById('scan-iac-button')
  .addEventListener('click', () => {
    vscode.postMessage({ command: '${VscodeCommands.IacScanForProjectCommandId}' });
  });

document
  .getElementById('open-cycode-settings')
  .addEventListener('click', () => {
    vscode.postMessage({ command: '${VscodeCommands.OpenSettingsCommandId}' });
  });
</script>
`;

export default getContent(title, body);
