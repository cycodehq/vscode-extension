import { getContent } from '../content';
import { VscodeCommands } from '../../../commands';

const body = `
<p>
  <button id="authenticate-button">Authenticate</button>
</p>

<p>
  To learn more about how to use Cycode in VSCode
  <a
    class="styled-link"
    href="https://github.com/cycodehq/vscode-extension/blob/main/README.md"
    >read our docs</a>.
</p>

<script>
registerButton('authenticate-button', '${VscodeCommands.AuthCommandId}', 'Authenticating...');
</script>
`;

export default getContent(body);
