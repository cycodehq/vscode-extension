import {ScanType} from '../../constants';
import scaRenderer from './renderer/sca';
import secretRenderer from './renderer/secret';
import iacRenderer from './renderer/iac';

export default (detectionType: ScanType) => `
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
</script>
    ${detectionType === ScanType.Sca ? scaRenderer : ''}
    ${detectionType === ScanType.Secrets ? secretRenderer : ''}
    ${detectionType === ScanType.Iac ? iacRenderer : ''}
<script>
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
`;
