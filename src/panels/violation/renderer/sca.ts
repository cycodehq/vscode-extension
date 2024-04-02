export default `
<script>
  const _resetDomState = () => {
      hideElement('summary');
      ge('summary-text').innerText = 'None';
  
      hideElement('first-patched-version');
      ge('first-patched-version-value').innerText = 'None';
  
      hideElement('licence');
      ge('licence-value').innerText = 'None';
  };
  
  const renderDetection = detection => {
      _resetDomState();
  
      const severityFirstLetter = detection.severity[0].toUpperCase();
      ge('severity-icon').src = severityIcons[severityFirstLetter];
      ge('package').innerText = detection.detection_details.package_name;
      ge('version').innerText = detection.detection_details.package_version;
      ge('dependency-path-value').innerText = detection.detection_details.dependency_paths;
  
      if (detection.detection_details.alert) {
        // if package vulnerability
       ge('title').innerText = detection.detection_details.alert.summary;
  
       const cwe = detection.detection_details.vulnerability_id;
       const severity = detection.severity;
       ge('short-details').innerText = severity + ' | ' + cwe;
  
       showElement('first-patched-version');
       ge('first-patched-version-value').innerText = detection.detection_details.alert.first_patched_version;
  
       showElement('summary');
       ge('summary-text').innerHTML = detection.detection_details.alert.description;
      } else {
        // if non-permissive license
        ge('title').innerText = detection.message;
  
        showElement('licence');
        ge('licence-value').innerText = detection.detection_details.license;
      }
  };
</script>
`;
