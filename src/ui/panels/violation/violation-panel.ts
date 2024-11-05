import * as vscode from 'vscode';
import { container } from 'tsyringe';
import content from './content';
import { createPanel, getPanel, removePanel, revealPanel } from './panel-manager';
import { calculateUniqueDetectionId, IScanResultsService } from '../../../services/scan-results-service';
import { getDetectionForRender } from './rendered-detection';
import { VscodeCommands } from '../../../commands';
import { LoggerServiceSymbol, ScanResultsServiceSymbol } from '../../../symbols';
import { DetectionBase } from '../../../cli/models/scan-result/detection-base';
import { SecretDetection } from '../../../cli/models/scan-result/secret/secret-detection';
import { CliIgnoreType } from '../../../cli/models/cli-ignore-type';
import { CliScanType } from '../../../cli/models/cli-scan-type';
import { ILoggerService } from '../../../services/logger-service';

const _SEVERITY_NAMES: readonly string[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];

const _loadSeverityIcons = (context: vscode.ExtensionContext, panel: vscode.WebviewPanel): Record<string, string> => {
  const webviewUris: Record<string, string> = {};
  for (const severity of _SEVERITY_NAMES) {
    const onDiskIconPath = vscode.Uri.joinPath(
      context.extensionUri, 'resources', 'severity', `${severity}.png`,
    );
    webviewUris[severity] = panel.webview.asWebviewUri(onDiskIconPath).toString();
  }

  return webviewUris;
};

const _sendSeverityIconsToRender = async (scanType: CliScanType, context: vscode.ExtensionContext) => {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);

  const panel = getPanel(scanType);
  if (!panel) {
    logger.error('Panel not found to send severity icons to render violation card');
    return;
  }

  const res = await panel.webview.postMessage({ severityIcons: _loadSeverityIcons(context, panel) });
  if (!res) {
    logger.error('Failed to send severity icons to render violation card');
  }
};

const _sendDetectionToRender = async (scanType: CliScanType, detection: DetectionBase) => {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);

  const panel = getPanel(scanType);
  if (!panel) {
    logger.error('Panel not found to send detection to render violation card');
    return;
  }

  const res = await panel.webview.postMessage({
    detectionType: scanType,
    detection: getDetectionForRender(scanType, detection),
    uniqueDetectionId: calculateUniqueDetectionId(detection),
  });
  if (!res) {
    logger.error('Failed to send detection to render violation card');
  }
};

const _onDidReceiveMessage = (message: Record<string, string>) => {
  if (message.command !== 'ignoreSecretByValue' || !message.uniqueDetectionId) {
    // TODO(MarshalX): implement other ignore commands
    return;
  }

  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  const detection = scanResultsService.getDetectionById(message.uniqueDetectionId);
  if (!detection) {
    return;
  }

  vscode.commands.executeCommand(
    VscodeCommands.IgnoreCommandId,
    CliScanType.Secret,
    CliIgnoreType.Value,
    (detection as SecretDetection).detectionDetails.detectedValue,
  );

  removePanel(CliScanType.Secret);
};

const _initPanel = (scanType: CliScanType, panel: vscode.WebviewPanel, context?: vscode.ExtensionContext) => {
  let subscriptions;
  if (context) {
    subscriptions = context.subscriptions;
  }

  panel.webview.onDidReceiveMessage(_onDidReceiveMessage);
  panel.webview.html = content(scanType);
  panel.onDidDispose(
    () => {
      removePanel(scanType);
    },
    null,
    subscriptions,
  );
};

export const createAndInitPanel = async (
  context: vscode.ExtensionContext,
  scanType: CliScanType,
  detection: DetectionBase,
) => {
  let panel = getPanel(scanType);
  if (panel) {
    revealPanel(scanType);
  } else {
    panel = createPanel(scanType);
    _initPanel(scanType, panel, context);
  }

  await _sendSeverityIconsToRender(scanType, context);
  await _sendDetectionToRender(scanType, detection);

  return panel;
};
