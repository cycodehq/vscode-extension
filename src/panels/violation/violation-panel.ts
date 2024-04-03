import * as vscode from 'vscode';
import content from './content';
import {Converter} from 'showdown';
import {AnyDetection, ScaDetection, SecretDetection} from '../../types/detection';
import {ScanType, SEVERITY_PRIORITIES_FIRST_LETTERS} from '../../constants';
import {createPanel, getPanel, removePanel, revealPanel} from './panel-manager';

const _loadSeverityIcons = (context: vscode.ExtensionContext, panel: vscode.WebviewPanel): Record<string, string> => {
  const webviewUris: Record<string, string> = {};
  for (const severity of SEVERITY_PRIORITIES_FIRST_LETTERS) {
    const fileName = severity.toUpperCase();
    const onDiskIconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'severity', `${fileName}.png`);
    webviewUris[fileName] = panel.webview.asWebviewUri(onDiskIconPath).toString();
  }

  return webviewUris;
};

const _sendSeverityIconsToRender = (detectionType: ScanType, context: vscode.ExtensionContext) => {
  const panel = getPanel(detectionType);
  if (!panel) {
    return;
  }

  panel.webview.postMessage({severityIcons: _loadSeverityIcons(context, panel)});
};

const _enrichDetectionForRender = (detectionType: ScanType, detection: AnyDetection): AnyDetection => {
  if (detectionType === ScanType.Sca) {
    detection = _enrichScaDetectionForRender(detection as ScaDetection);
  } else if (detectionType === ScanType.Secrets) {
    detection = _enrichSecretDetectionForRender(detection as SecretDetection);
  }

  return detection;
};

const _enrichScaDetectionForRender = (detection: ScaDetection): ScaDetection => {
  if (detection.detection_details.alert) {
    const markdownConverter = new Converter();
    detection.detection_details.alert.description =
        markdownConverter.makeHtml(detection.detection_details.alert.description);

    if (!detection.detection_details.alert.first_patched_version) {
      detection.detection_details.alert.first_patched_version = 'Not fixed';
    }
  }

  return detection;
};

const _enrichSecretDetectionForRender = (detection: SecretDetection): SecretDetection => {
  detection.message = detection.message.replace(
      'within \'\' repository',
      ''
  );

  if (detection.detection_details.custom_remediation_guidelines) {
    const markdownConverter = new Converter();
    detection.detection_details.custom_remediation_guidelines =
        markdownConverter.makeHtml(detection.detection_details.custom_remediation_guidelines);
  }

  return detection;
};

const _sendDetectionToRender = (detectionType: ScanType, detection: AnyDetection) => {
  const panel = getPanel(detectionType);
  if (!panel) {
    return;
  }

  _enrichDetectionForRender(detectionType, detection);

  console.log(detectionType, detection);

  panel.webview.postMessage({detectionType: detectionType, detection: detection});
};

const _initPanel = (detectionType: ScanType, panel: vscode.WebviewPanel, context?: vscode.ExtensionContext) => {
  let subscriptions;
  if (context) {
    subscriptions = context.subscriptions;
  }

  panel.webview.html = content(detectionType);
  panel.onDidDispose(
      () => {
        removePanel(detectionType);
      },
      null,
      subscriptions
  );
};

export const createAndInitPanel = (
    context: vscode.ExtensionContext,
    detectionType: ScanType,
    detection: AnyDetection
) => {
  let panel = getPanel(detectionType);
  if (panel) {
    revealPanel(detectionType);
  } else {
    panel = createPanel(detectionType);
    _initPanel(detectionType, panel, context);
  }

  if (context) {
    _sendSeverityIconsToRender(detectionType, context);
  }

  if (detectionType && detection) {
    _sendDetectionToRender(detectionType, detection);
  }

  return panel;
};
