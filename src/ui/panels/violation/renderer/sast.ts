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

  const severityFirstLetter = detection.severity;
  ge('severity-icon').src = severityIcons[severityFirstLetter];

  ge('title').innerText = detection.detectionDetails.policyDisplayName;

  const renderedCwes = detection.detectionDetails.cwe.map(cwe => renderCweCveLink(cwe));
  const cwes = renderedCwes.join(', ');
  if (cwes) {
    ge('short-details').innerHTML = [detection.severity, cwes].join(' | ');    
  } else {
    ge('short-details').innerText = detection.severity;
  }

  ge('rule').innerText = detection.detectionRuleId;
  ge('file').innerText = detection.detectionDetails.fileName;
  ge('subcategory').innerText = detection.detectionDetails.category;
  ge('language').innerText = detection.detectionDetails.languages.join(', ');

  const engineIdToDisplayName = {
    '5db84696-88dc-11ec-a8a3-0242ac120002': 'Semgrep OSS (Orchestrated by Cycode)',
    '560a0abd-d7da-4e6d-a3f1-0ed74895295c': 'Bearer (Powered by Cycode)',
  }
  const engineId = detection.detectionDetails.externalScannerId;
  ge('engine').innerText = engineIdToDisplayName[engineId] || 'None';

  ge('summary-text').innerHTML = detection.detectionDetails.description;

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
