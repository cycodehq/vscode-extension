export default `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cycode: Detection Details</title>
</head>
<body>
    <style>
        .hidden {
          display: none;
        }

        .card {
          position: relative;
          display: flex;
          flex-direction: column;
        }
        
        section {
          padding: 10px;
        }
        
        body {
          line-height: 1.5;
        }

        .vscode-dark .hr {
          border-top: 1px solid rgba(255, 255, 255, 0.18);
        }
        
        .vscode-light .hr {
          border-top: 1px solid rgba(0, 0, 0, 0.18);
        }
        
        .severity {
          display: flex;
          float: left;
          flex-direction: column;
          margin: 0 1rem 0 0;
        }
        
        .severity-icon {
          width: 40px;
          height: 40px;
        }
        
        .title {
          margin-top: 0.2rem;
          margin-bottom: 1rem;
          font-size: 1.3rem;
          line-height: 1.6;
        }

        .details-item {
          display: flex;
          margin: 0.2em 0 0.2em 0;
        }
        
        .details-item-title {
          flex: 30%;
          opacity: 0.7;
        }
        
        .details-item-value {
          flex: 70%;
        }
    </style>

    <section class="card">
      <section class="header">
          <div class="severity">
              <img class="severity-icon" alt="Severity" />
          </div>
          <div class="title">None</div>
          <div class="short-details"></div>
      </section>

      <section class="hr details">
          <div class="details-item">
            <div class="details-item-title">Package:</div>
            <div class="details-item-value package">None</div>
          </div>
          <div class="details-item">
            <div class="details-item-title">Version:</div>
            <div class="details-item-value version">None</div>
          </div>
          <div class="first-patched-version">
            <div class="details-item">
              <div class="details-item-title">First patched version:</div>
              <div class="details-item-value first-patched-version-value">None</div>
            </div>
          </div>
          <div class="dependency-path">
            <div class="details-item">
              <div class="details-item-title">Dependency path:</div>
              <div class="details-item-value dependency-path-value">None</div>
            </div>
          </div>
          <div class="licence">
            <div class="details-item">
              <div class="details-item-title">License:</div>
              <div class="details-item-value licence-value">None</div>
            </div>
          </div>
      </section>
      
      <section class="hr summary">
        <h2>Summary</h2>
        <div class="summary-text">None</div>
      </section>
    </section>

    <script>
        const vscode = acquireVsCodeApi();
        const prevState = vscode.getState();
    
        let severityIcons = (prevState && prevState.severityIcons) || {};
        let detection = (prevState && prevState.detection) || undefined; 

        const ge = className => document.getElementsByClassName(className)[0];

        const hideElement = className => {
          const element = ge(className);
          if (element && !element.className.includes('hidden')) {
              element.className += ' hidden';
          }
        };

        const showElement = className => {
          const element = ge(className);
          if (element) {
              element.className = element.className.replace(' hidden', '');
          }
        };

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

        if (detection) {
            renderDetection(detection);
        }

        const updateState = () => {
            vscode.setState({ severityIcons: severityIcons, detection: detection });
        };

        const messageHandler = event => {
            const message = event.data;

            if (message.severityIcons) {
                severityIcons = message.severityIcons;
                updateState();
            } else if (message.detection) {
                detection = message.detection;
                updateState();

                renderDetection(message.detection);
            }
        };

        window.addEventListener('message', messageHandler);
    </script>
</body>
</html>
`;
