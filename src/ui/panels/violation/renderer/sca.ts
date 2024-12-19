export default `
<script>
const _resetDomState = () => {
  hideElement('summary');
  ge('summary-text').innerText = 'None';

  hideElement('first-patched-version');
  ge('first-patched-version-value').innerText = 'None';

  hideElement('licence');
  ge('licence-value').innerText = 'None';

  hideElement('company-guidelines');
  ge('company-guidelines-text').innerText = 'None';

  hideElement('cycode-guidelines');
  ge('cycode-guidelines-text').innerText = 'None';

  hideElement('ignore-btn');
};

const renderDetection = detection => {
  _resetDomState();

  ge('ignore-btn').onclick = () => {
    vscode.postMessage({ command: 'ignoreScaByCve', uniqueDetectionId });
  };

  ge('severity-icon').src = severityIcons[detection.severity];
  ge('package').innerText = detection.detectionDetails.packageName;
  ge('version').innerText = detection.detectionDetails.packageVersion;
  ge('dependency-path-value').innerText = detection.detectionDetails.dependencyPaths;

  if (detection.detectionDetails.alert) {
    // if package vulnerability
    ge('title').innerText = detection.detectionDetails.alert.summary;

    if (detection.detectionDetails.alert.cveIdentifier) {
      showElement('ignore-btn');
    }

    const cwe = renderCweCveLink(detection.detectionDetails.vulnerabilityId);
    const severity = detection.severity;
    ge('short-details').innerHTML = severity + ' | ' + cwe;

    showElement('first-patched-version');
    ge('first-patched-version-value').innerText = detection.detectionDetails.alert.firstPatchedVersion;
  } else {
    // if non-permissive license
    ge('title').innerText = detection.message;

    showElement('licence');
    ge('licence-value').innerText = detection.detectionDetails.license;
  }

  if (detection.detectionDetails.description) {
    showElement('summary');
    ge('summary-text').innerHTML = detection.detectionDetails.description;
  }

  if (detection.detectionDetails.customRemediationGuidelines) {
    showElement('company-guidelines');
    ge('company-guidelines-text').innerHTML = detection.detectionDetails.customRemediationGuidelines;    
  }

  if (detection.detectionDetails.remediationGuidelines) {
    showElement('cycode-guidelines');
    ge('cycode-guidelines-text').innerHTML = detection.detectionDetails.remediationGuidelines;    
  }
};
</script>
`;
