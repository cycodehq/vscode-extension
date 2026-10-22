import { getContent } from '../content';
import { VscodeCommands } from '../../../commands';
import { CliScanType } from '../../../cli/models/cli-scan-type';
import { getScanTypeDisplayName } from '../../../constants';
import {
  DEFAULT_DIFF_FROM_REF, DEFAULT_DIFF_TO_REF, HEAD_REF_VALUE, LOCAL_DIRECTORY_REF_VALUE,
} from '../../../services/state-service';

const getBtnText = (scanType: CliScanType, inProgress = false) => {
  const verb = inProgress ? 'Scanning' : 'Scan';
  const ellipsis = inProgress ? '...' : '';
  return `${verb} for ${getScanTypeDisplayName(scanType)}${ellipsis}`;
};

const body = `
<div class="scan-scope-header">
  <div class="scan-scope-label">Scan Scope</div>
  <div class="scan-scope-options">
    <button id="scope-project-btn" class="scope-option-button active"
      title="Scan the entire project">Project</button>
    <button id="scope-diff-btn" class="scope-option-button" style="display: none;"
      title="Compare two revisions">Diff</button>
    <button id="scope-file-btn" class="scope-option-button"
      title="Scan only the current file">File</button>
  </div>
  <div id="scope-project-desc" class="scan-scope-description">
    Scans your entire open project.
    <div class="scan-scope-tradeoff">Slowest, most accurate — scans your full codebase with complete context.</div>
  </div>
  <div id="scope-diff-desc" class="scan-scope-description" hidden>
    <div>Compares the two selected revisions.</div>
    <div class="scan-scope-tradeoff">
      Faster, slightly reduced accuracy — only scans changed files, so issues that depend on unchanged code
      may be missed.
    </div>
    <div class="scan-diff-refs">
      <select id="scope-diff-from-select" class="scope-diff-ref-select" title="Compare from"></select>
      <span class="scan-diff-arrow">&rarr;</span>
      <select id="scope-diff-to-select" class="scope-diff-ref-select" title="Compare to"></select>
    </div>
    <div>
      Pick "Local directory" on one side to include your
      uncommitted changes (staged and unstaged). IaC is not currently supported for this
      scope and a full project scan is run instead.
    </div>
  </div>
  <div id="scope-file-desc" class="scan-scope-description" hidden>
    Scans only the file currently open in the editor.
    <div class="scan-scope-tradeoff">
      Fastest, least accurate — scans a single file in isolation, missing cross-file and dependency context.
    </div>
  </div>
</div>

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

const LOCAL_DIRECTORY_REF_VALUE = '${LOCAL_DIRECTORY_REF_VALUE}';
const HEAD_REF_VALUE = '${HEAD_REF_VALUE}';

const scopeButtons = {
  project: ge('scope-project-btn'),
  diff: ge('scope-diff-btn'),
  file: ge('scope-file-btn'),
};
const scopeDescriptions = {
  project: ge('scope-project-desc'),
  diff: ge('scope-diff-desc'),
  file: ge('scope-file-desc'),
};
// the extension owns the stored scope; this view only renders what it is told
let currentScope = 'project';
let diffScopeSupported = false;
const setActiveScope = (scope) => {
  currentScope = scope;
  // until the extension reports that Diff is supported, a stored "diff" scope is only displayed as Project
  const shownScope = scope === 'diff' && !diffScopeSupported ? 'project' : scope;
  for (const [key, btn] of Object.entries(scopeButtons)) btn.classList.toggle('active', key === shownScope);
  for (const [key, desc] of Object.entries(scopeDescriptions)) desc.hidden = key !== shownScope;
};
scopeButtons.project.addEventListener(
  'click', () => vscode.postMessage({ command: '${VscodeCommands.SetScanScopeProjectCommandId}' })
);
scopeButtons.diff.addEventListener(
  'click', () => vscode.postMessage({ command: '${VscodeCommands.SetScanScopeDiffCommandId}' })
);
scopeButtons.file.addEventListener(
  'click', () => vscode.postMessage({ command: '${VscodeCommands.SetScanScopeFileCommandId}' })
);

const diffFromSelect = ge('scope-diff-from-select');
const diffToSelect = ge('scope-diff-to-select');
let availableGitRefs = [];
let lastGitRefsJson = '';
let diffFromRef = '${DEFAULT_DIFF_FROM_REF}';
let diffToRef = '${DEFAULT_DIFF_TO_REF}';

const buildRefOptionList = () => {
  const options = [{ value: LOCAL_DIRECTORY_REF_VALUE, label: 'Local directory' }];
  if (!availableGitRefs.some(ref => ref.value === HEAD_REF_VALUE)) {
    options.push({ value: HEAD_REF_VALUE, label: 'HEAD (current)' });
  }
  return options.concat(availableGitRefs);
};

const renderSelectOptions = (select, selectedValue, otherSelectedValue) => {
  const options = buildRefOptionList();
  // keep a stored selection visible even if it isn't in the current list (e.g. before the refs have loaded)
  if (!options.some(option => option.value === selectedValue)) {
    options.push({ value: selectedValue, label: selectedValue });
  }
  select.innerHTML = '';
  for (const option of options) {
    const optionEl = document.createElement('option');
    optionEl.value = option.value;
    optionEl.innerText = option.label;
    // both sides must differ (this also prevents "Local directory" on both sides)
    optionEl.disabled = option.value === otherSelectedValue;
    select.appendChild(optionEl);
  }
  select.value = selectedValue;
};

const renderDiffRefSelects = () => {
  renderSelectOptions(diffFromSelect, diffFromRef, diffToRef);
  renderSelectOptions(diffToSelect, diffToRef, diffFromRef);
};

diffFromSelect.addEventListener('change', () => {
  diffFromRef = diffFromSelect.value;
  renderDiffRefSelects();
  vscode.postMessage({ command: '${VscodeCommands.SetScanDiffFromRefCommandId}', args: [diffFromRef] });
});
diffToSelect.addEventListener('change', () => {
  diffToRef = diffToSelect.value;
  renderDiffRefSelects();
  vscode.postMessage({ command: '${VscodeCommands.SetScanDiffToRefCommandId}', args: [diffToRef] });
});

renderDiffRefSelects();

window.addEventListener('message', event => {
    if (event.data.command === 'supportedModules' && event.data.modules) {
      const modules = event.data.modules;
      ge('scan-secrets-button').disabled = !modules.secretEnabled;
      ge('scan-sca-button').disabled = !modules.scaEnabled;
      ge('scan-sast-button').disabled = !modules.sastEnabled;
      ge('scan-iac-button').disabled = !modules.iacEnabled;
    }
    if (event.data.command === 'scanScope' && event.data.scope) {
      setActiveScope(event.data.scope);
      // the selects are only rebuilt when something changed, since rebuilding closes an open dropdown
      const nextFromRef = event.data.diffFromRef || diffFromRef;
      const nextToRef = event.data.diffToRef || diffToRef;
      if (nextFromRef !== diffFromRef || nextToRef !== diffToRef) {
        diffFromRef = nextFromRef;
        diffToRef = nextToRef;
        renderDiffRefSelects();
      }
    }
    if (event.data.command === 'gitRefs' && event.data.refs) {
      const refsJson = JSON.stringify(event.data.refs);
      if (refsJson !== lastGitRefsJson) {
        lastGitRefsJson = refsJson;
        availableGitRefs = event.data.refs;
        renderDiffRefSelects();
      }
    }
    if (event.data.command === 'diffScopeSupported') {
      diffScopeSupported = !!event.data.supported;
      scopeButtons.diff.style.display = diffScopeSupported ? '' : 'none';
      setActiveScope(currentScope);
    }
});
</script>
`;

export default getContent(body);
