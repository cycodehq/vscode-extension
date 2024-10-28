import { getContent } from '../content';
import { VscodeCommands } from '../../../commands';

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
    >read our docs</a>.
</p>
</div>

<script>
registerButton('authenticate-button', '${VscodeCommands.AuthCommandId}', 'Authenticating...');
</script>
`;

export default getContent(body);
