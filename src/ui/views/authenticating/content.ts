import { getContent } from '../content-base';

const title = 'Authenticating';

const body = `
<p>
  Cycode extension requires pre-installed
  <a
    class="styled-link"
    href="https://github.com/cycodehq/cycode-cli#install-cycode-cli"
    >Cycode CLI</a
  >
</p>
<button>Authenticating...</button>
</div>
`;

export default getContent(title, body);
