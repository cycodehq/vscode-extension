import * as vscode from 'vscode';
import content from './content';
import { Converter } from 'showdown';
import { AnyDetection, ScaDetection } from '../../types/detection';
import { ScanType, SEVERITY_PRIORITIES_FIRST_LETTERS } from '../../constants';

let _currentPanel: vscode.WebviewPanel | undefined = undefined;

const _loadSeverityIcons = (context: vscode.ExtensionContext ,panel: vscode.WebviewPanel): Record<string, string> => {
  const webviewUris: Record<string, string> = {};
  for (const severity of SEVERITY_PRIORITIES_FIRST_LETTERS) {
    const fileName = severity.toUpperCase();
    const onDiskIconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'severity', `${fileName}.png`);
    webviewUris[fileName] = panel.webview.asWebviewUri(onDiskIconPath).toString();
  }

  return webviewUris;
};

const _sendSeverityIconsToRender = (context: vscode.ExtensionContext) => {
  if (!_currentPanel) {
    return;
  }

  _currentPanel.webview.postMessage({severityIcons: _loadSeverityIcons(context, _currentPanel)});
};


const _enrichDetectionForRender = (detectionType: string, detection: AnyDetection): AnyDetection => {
  if (detectionType === ScanType.Sca) {
    detection = _enrichScaDetectionForRender(detection as ScaDetection);
  }

  return detection;
};

const _enrichScaDetectionForRender = (detection: ScaDetection): ScaDetection => {
  if (detection.detection_details.alert) {
    const markdownConverter = new Converter();
    detection.detection_details.alert.description = markdownConverter.makeHtml(detection.detection_details.alert.description);

    if (!detection.detection_details.alert.first_patched_version) {
      detection.detection_details.alert.first_patched_version = "Not fixed";
    }
  }

  return detection;
};

const _sendDetectionToRender = (detectionType: string, detection: AnyDetection) => {
  if (!_currentPanel) {
    return;
  }

  _enrichDetectionForRender(detectionType, detection);

  _currentPanel.webview.postMessage({detectionType: detectionType, detection: detection});
};

export const restoreWebViewPanel = (panel: vscode.WebviewPanel) => {
  _currentPanel = panel;
  _initPanel(_currentPanel);
  _currentPanel.reveal(vscode.ViewColumn.Two);
};

const _createWebviewPanel = () => {
  return vscode.window.createWebviewPanel(
    'detectionDetails',
    'Cycode: Detection Details',
    vscode.ViewColumn.Two,
    {
      enableScripts: true
    }
  );
};

const _initPanel = (panel: vscode.WebviewPanel, context?: vscode.ExtensionContext) => {
  let subscriptions;
  if (context) {
    subscriptions = context.subscriptions;
  }

  panel.webview.html = content;
  panel.onDidDispose(
    () => {
      _currentPanel = undefined;
    },
    null,
    subscriptions
  );
};

export const createPanel = (
  context?: vscode.ExtensionContext,
  detectionType?: string,
  detection?: AnyDetection
) => {
  if (_currentPanel) {
    _currentPanel.reveal(vscode.ViewColumn.Two);
  } else {
    _currentPanel = _createWebviewPanel();
    _initPanel(_currentPanel, context);
  }

  if (context) {
    _sendSeverityIconsToRender(context);
  }

  if (detectionType && detection) {
    _sendDetectionToRender(detectionType, detection);
  }

  return _currentPanel;
};
