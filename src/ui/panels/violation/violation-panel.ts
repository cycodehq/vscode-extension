import * as vscode from 'vscode';
import { container } from 'tsyringe';
import content from './content';
import { ScanType, SEVERITY_PRIORITIES_FIRST_LETTERS } from '../../../constants';
import { createPanel, getPanel, removePanel, revealPanel } from './panel-manager';
import { calculateUniqueDetectionId, IScanResultsService } from '../../../services/scan-results-service';
import { getDetectionForRender } from './rendered-detection';
import { VscodeCommands } from '../../../commands';
import { CommandParameters } from '../../../cli/constants';
import { IgnoreCommandConfig } from '../../../types/commands';
import { ScanResultsServiceSymbol } from '../../../symbols';
import { getSecretDetectionIdeData } from '../../../providers/diagnostics/secret-diagnostics';
import { DetectionBase } from '../../../cli/models/scan-result/detection-base';
import { SecretDetection } from '../../../cli/models/scan-result/secret/secret-detection';

const _loadSeverityIcons = (context: vscode.ExtensionContext, panel: vscode.WebviewPanel): Record<string, string> => {
  const webviewUris: Record<string, string> = {};
  for (const severity of SEVERITY_PRIORITIES_FIRST_LETTERS) {
    const fileName = severity.toUpperCase();
    const onDiskIconPath = vscode.Uri.joinPath(
      context.extensionUri, 'resources', 'severity', `${fileName}.png`,
    );
    webviewUris[fileName] = panel.webview.asWebviewUri(onDiskIconPath).toString();
  }

  return webviewUris;
};

const _sendSeverityIconsToRender = (detectionType: ScanType, context: vscode.ExtensionContext) => {
  const panel = getPanel(detectionType);
  if (!panel) {
    return;
  }

  panel.webview.postMessage({ severityIcons: _loadSeverityIcons(context, panel) });
};

const _sendDetectionToRender = (detectionType: ScanType, detection: DetectionBase) => {
  const panel = getPanel(detectionType);
  if (!panel) {
    return;
  }

  panel.webview.postMessage({
    detectionType,
    detection: getDetectionForRender(detectionType, detection),
    uniqueDetectionId: calculateUniqueDetectionId(detection),
  });
};

const _onDidReceiveMessage = async (message: Record<string, string>) => {
  if (message.command !== 'ignoreSecretByValue' || !message.uniqueDetectionId) {
    // TODO(MarshalX): implement other ignore commands
    return;
  }

  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  const detection = scanResultsService.getDetectionById(message.uniqueDetectionId);
  if (!detection) {
    return;
  }

  const ideData = await getSecretDetectionIdeData(detection as SecretDetection);

  vscode.commands.executeCommand(
    VscodeCommands.IgnoreCommandId,
    {
      scanType: ScanType.Secret,
      ignoreBy: CommandParameters.ByValue,
      param: ideData.value,
      filePath: ideData.documentPath,
    } as IgnoreCommandConfig,
  );

  removePanel(ScanType.Secret);
};

const _initPanel = (detectionType: ScanType, panel: vscode.WebviewPanel, context?: vscode.ExtensionContext) => {
  let subscriptions;
  if (context) {
    subscriptions = context.subscriptions;
  }

  panel.webview.onDidReceiveMessage(_onDidReceiveMessage);
  panel.webview.html = content(detectionType);
  panel.onDidDispose(
    () => {
      removePanel(detectionType);
    },
    null,
    subscriptions,
  );
};

export const createAndInitPanel = (
  context: vscode.ExtensionContext,
  detectionType: ScanType,
  detection: DetectionBase,
) => {
  let panel = getPanel(detectionType);
  if (panel) {
    revealPanel(detectionType);
  } else {
    panel = createPanel(detectionType);
    _initPanel(detectionType, panel, context);
  }

  _sendSeverityIconsToRender(detectionType, context);
  _sendDetectionToRender(detectionType, detection);

  return panel;
};
