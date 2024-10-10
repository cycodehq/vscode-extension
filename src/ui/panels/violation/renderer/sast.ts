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

  const severityFirstLetter = detection.severity[0].toUpperCase();
  ge('severity-icon').src = severityIcons[severityFirstLetter];

  ge('title').innerText = detection.detection_details.policy_display_name;

  const renderedCwes = detection.detection_details.cwe.map(cwe => renderCweCveLink(cwe));
  const cwes = renderedCwes.join(', ');
  if (cwes) {
    ge('short-details').innerHTML = [detection.severity, cwes].join(' | ');    
  } else {
    ge('short-details').innerText = detection.severity;
  }

  ge('rule').innerText = detection.detection_rule_id;
  ge('file').innerText = detection.detection_details.file_name;
  ge('subcategory').innerText = detection.detection_details.category;
  ge('language').innerText = detection.detection_details.languages.join(', ');

  const engineIdToDisplayName = {
    '5db84696-88dc-11ec-a8a3-0242ac120002': 'Semgrep OSS (Orchestrated by Cycode)',
    '560a0abd-d7da-4e6d-a3f1-0ed74895295c': 'Bearer (Powered by Cycode)',
  }
  const engineId = detection.detection_details.external_scanner_id;
  ge('engine').innerText = engineIdToDisplayName[engineId] || 'None';

  ge('summary-text').innerHTML = detection.detection_details.description;

  if (detection.detection_details.custom_remediation_guidelines) {
    showElement('company-guidelines');
    ge('company-guidelines-text').innerHTML = detection.detection_details.custom_remediation_guidelines;    
  }

  if (detection.detection_details.remediation_guidelines) {
    showElement('cycode-guidelines');
    ge('cycode-guidelines-text').innerHTML = detection.detection_details.remediation_guidelines;    
  }
};
</script>
`;
