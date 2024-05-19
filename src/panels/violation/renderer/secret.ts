export default `
<script>
const _resetDomState = () => {
  hideElement('company-guidelines');
  ge('company-guidelines-text').innerText = 'None';
};

const renderDetection = detection => {
  _resetDomState();

  ge('ignore-btn').onclick = () => {
    vscode.postMessage({ command: 'ignoreSecretByValue', uniqueDetectionId });
  };

  const severityFirstLetter = detection.severity[0].toUpperCase();
  ge('severity-icon').src = severityIcons[severityFirstLetter];

  ge('title').innerText = 'Hardcoded ' + detection.type + ' is used';
  ge('short-details').innerText = detection.severity;
  ge('summary-text').innerHTML = detection.detection_details.description;

  ge('rule').innerText = detection.detection_rule_id;
  ge('file').innerText = detection.detection_details.file_name;
  ge('sha').innerText = detection.detection_details.sha512;

  if (detection.detection_details.custom_remediation_guidelines) {
    showElement('company-guidelines');
    ge('company-guidelines-text').innerHTML = detection.detection_details.custom_remediation_guidelines;    
  }
};
</script>
`;
