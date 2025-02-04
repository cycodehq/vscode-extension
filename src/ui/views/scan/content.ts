import { getContent } from '../content';
import { VscodeCommands } from '../../../commands';
import { CliScanType } from '../../../cli/models/cli-scan-type';
import { getScanTypeDisplayName } from '../../../constants';

const getBtnText = (scanType: CliScanType, inProgress = false) => {
  const verb = inProgress ? 'Scanning' : 'Scan';
  const ellipsis = inProgress ? '...' : '';
  return `${verb} for ${getScanTypeDisplayName(scanType)}${ellipsis}`;
};

const body = `
<p>Ready to scan.</p>
<button disabled id="scan-secrets-button">${getBtnText(CliScanType.Secret)}</button>
<br />
<button disabled id="scan-sca-button">${getBtnText(CliScanType.Sca)}</button>
<br />
<button disabled id="scan-sast-button">${getBtnText(CliScanType.Sast)}</button>
<br />
<button disabled id="scan-iac-button">${getBtnText(CliScanType.Iac)}</button>

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
registerButton(
  'scan-secrets-button', '${VscodeCommands.SecretScanForProjectCommandId}', '${getBtnText(CliScanType.Secret, true)}'
);
registerButton(
  'scan-sca-button', '${VscodeCommands.ScaScanCommandId}', '${getBtnText(CliScanType.Sca, true)}'
);
registerButton(
  'scan-sast-button', '${VscodeCommands.SastScanForProjectCommandId}', '${getBtnText(CliScanType.Sast, true)}'
);
registerButton(
  'scan-iac-button', '${VscodeCommands.IacScanForProjectCommandId}', '${getBtnText(CliScanType.Iac, true)}'
);
registerButton('open-cycode-settings', '${VscodeCommands.OpenSettingsCommandId}');

window.addEventListener('message', event => {
    if (event.data.command === 'supportedModules' && event.data.modules) {
      const modules = event.data.modules;
      ge('scan-secrets-button').disabled = !modules.secretEnabled;
      ge('scan-sca-button').disabled = !modules.scaEnabled;
      ge('scan-sast-button').disabled = !modules.sastEnabled;
      ge('scan-iac-button').disabled = !modules.iacEnabled;
    }
});
</script>
`;

export default getContent(body);
