export default `
<script>
const _resetDomState = () => {
  hideElement('company-guidelines');
  ge('company-guidelines-text').innerText = 'None';

  hideElement('cycode-guidelines');
  ge('cycode-guidelines-text').innerText = 'None';
};

const renderDetection = detection => {
  _resetDomState();

  ge('ignore-btn').onclick = () => {
    vscode.postMessage({ command: 'ignoreSecretByValue', uniqueDetectionId });
  };

  ge('severity-icon').src = severityIcons[detection.severity];

  ge('title').innerText = 'Hardcoded ' + detection.type + ' is used';
  ge('short-details').innerText = detection.severity;
  ge('summary-text').innerHTML = detection.detectionDetails.description;

  ge('rule').innerText = detection.detectionRuleId;
  ge('file').innerText = detection.detectionDetails.fileName;
  ge('sha').innerText = detection.detectionDetails.sha512;

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
