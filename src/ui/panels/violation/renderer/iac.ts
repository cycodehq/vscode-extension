export default `
<script>
const _resetDomState = () => {
  resetAiElements();

  hideElement('company-guidelines');
  ge('company-guidelines-text').innerText = 'None';

  hideElement('cycode-guidelines');
  ge('cycode-guidelines-text').innerText = 'None';
};

const renderDetection = detection => {
  _resetDomState();
  registerAiButtonCallbacks();

  ge('severity-icon').src = severityIcons[detection.severity];

  ge('title').innerText = detection.message;
  ge('short-details').innerText = detection.severity;
  ge('summary-text').innerHTML = detection.detectionDetails.description;

  ge('rule').innerText = detection.detectionRuleId;
  ge('file').innerText = detection.detectionDetails.fileName;
  ge('provider').innerText = detection.detectionDetails.infraProvider;

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
