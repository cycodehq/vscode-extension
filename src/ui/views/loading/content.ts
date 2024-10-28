import { getContent } from '../content';

const body = `
<div>
  <p>Cycode is loading... It may take a few seconds to load the plugin.</p>
  <p>The plugin uses Cycode CLI as the core engine for the entire developer experience ecosystem.</p>

  <p>The loading process contains 3 steps:</p>
  <ol>
    <li>Trying to find the core and verifying installation.</li>
    <li>Downloading the core if it does not exist and if executable auto-management setting is enabled.</li>
    <li>Health-checking the core and negotiating versions.</li>
  </ol>
  
  <p>Note: If it's your first time using the plugin, it may take a bit longer to download the core.</p>
</div>
`;

export default getContent(body);
