import * as vscode from 'vscode';
import * as path from 'path';
import content from './content';
import {Converter} from 'showdown';
import {AnyDetection, IacDetection, SastDetection, ScaDetection, SecretDetection} from '../../types/detection';
import {ScanType, SEVERITY_PRIORITIES_FIRST_LETTERS} from '../../constants';
import {createPanel, getPanel, removePanel, revealPanel} from './panel-manager';

const _MARKDOWN_CONVERTER = new Converter();
// BE not always return markdown/html links, so we need to parse it by ourselves
_MARKDOWN_CONVERTER.setOption('simplifiedAutoLink', true);
_MARKDOWN_CONVERTER.setOption('openLinksInNewWindow', true); // make sure that it will open with noreferrer etc.
_MARKDOWN_CONVERTER.setOption('headerLevelStart', 2); // disable h1 to not make UI ugly

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
  } else if (detectionType === ScanType.Iac) {
    detection = _enrichIacDetectionForRender(detection as IacDetection);
  } else if (detectionType === ScanType.Sast) {
    detection = _enrichSastDetectionForRender(detection as SastDetection);
  }

  return detection;
};

const _enrichScaDetectionForRender = (detection: ScaDetection): ScaDetection => {
  if (detection.detection_details.alert) {
    detection.detection_details.alert.description =
        _MARKDOWN_CONVERTER.makeHtml(detection.detection_details.alert.description);

    if (!detection.detection_details.alert.first_patched_version) {
      detection.detection_details.alert.first_patched_version = 'Not fixed';
    }
  }

  return detection;
};

const _enrichSecretDetectionForRender = (detection: SecretDetection): SecretDetection => {
  detection.message = detection.message.replace(
      'within \'\' repository', // BE bug
      ''
  );

  detection.detection_details.description = detection.detection_details.description || detection.message;
  if (detection.detection_details.description) {
    // wrap with P tag to make it consistent with other HTML sections
    detection.detection_details.description =
        _MARKDOWN_CONVERTER.makeHtml(detection.detection_details.description);
  }

  if (detection.detection_details.custom_remediation_guidelines) {
    detection.detection_details.custom_remediation_guidelines =
        _MARKDOWN_CONVERTER.makeHtml(detection.detection_details.custom_remediation_guidelines);
  }

  return detection;
};

const _enrichIacDetectionForRender = (detection: IacDetection): IacDetection => {
  detection.detection_details.file_name = path.basename(detection.detection_details.file_name);

  if (detection.detection_details.remediation_guidelines) {
    detection.detection_details.remediation_guidelines =
        _MARKDOWN_CONVERTER.makeHtml(detection.detection_details.remediation_guidelines);
  }

  if (detection.detection_details.custom_remediation_guidelines) {
    detection.detection_details.custom_remediation_guidelines =
        _MARKDOWN_CONVERTER.makeHtml(detection.detection_details.custom_remediation_guidelines);
  }

  detection.detection_details.description = detection.detection_details.description || detection.message;
  if (detection.detection_details.description) {
    // wrap with P tag to make it consistent with other HTML sections
    detection.detection_details.description =
        _MARKDOWN_CONVERTER.makeHtml(detection.detection_details.description);
  }

  return detection;
};

const _enrichSastDetectionForRender = (detection: SastDetection): SastDetection => {
  if (detection.detection_details.description) {
    detection.detection_details.description =
        _MARKDOWN_CONVERTER.makeHtml(detection.detection_details.description);
  }

  return detection;
};

const _sendDetectionToRender = (detectionType: ScanType, detection: AnyDetection) => {
  const panel = getPanel(detectionType);
  if (!panel) {
    return;
  }

  _enrichDetectionForRender(detectionType, detection);

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
