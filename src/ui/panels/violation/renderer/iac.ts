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

  ge('title').innerText = detection.message;
  ge('short-details').innerText = detection.severity;
  ge('summary-text').innerHTML = detection.detection_details.description;

  ge('rule').innerText = detection.detection_rule_id;
  ge('file').innerText = detection.detection_details.file_name;
  ge('provider').innerText = detection.detection_details.infra_provider;

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
