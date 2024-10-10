import * as vscode from 'vscode';
import content from './content';
import {AnyDetection, SecretDetection} from '../../../types/detection';
import {ScanType, SEVERITY_PRIORITIES_FIRST_LETTERS} from '../../../constants';
import {createPanel, getPanel, removePanel, revealPanel} from './panel-manager';
import {calculateUniqueDetectionId, IScanResultsService} from '../../../services/scan-results-service';
import {enrichDetectionForRender} from './enrich-detection';
import {VscodeCommands} from '../../../commands';
import {CommandParameters} from '../../../cli-wrapper/constants';
import {IgnoreCommandConfig} from '../../../types/commands';
import {getSecretDetectionIdeData} from '../../../services/scanners/secret-scanner';
import {container} from 'tsyringe';
import {ScanResultsServiceSymbol} from '../../../symbols';

const _loadSeverityIcons = (context: vscode.ExtensionContext, panel: vscode.WebviewPanel): Record<string, string> => {
  const webviewUris: Record<string, string> = {};
  for (const severity of SEVERITY_PRIORITIES_FIRST_LETTERS) {
    const fileName = severity.toUpperCase();
    const onDiskIconPath = vscode.Uri.joinPath(
        context.extensionUri, 'resources', 'severity', `${fileName}.png`
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

  panel.webview.postMessage({severityIcons: _loadSeverityIcons(context, panel)});
};

const _sendDetectionToRender = (detectionType: ScanType, detection: AnyDetection) => {
  const panel = getPanel(detectionType);
  if (!panel) {
    return;
  }

  // we must calculate unique detection id before enriching detection
  const uniqueDetectionId = calculateUniqueDetectionId(detection);
  enrichDetectionForRender(detectionType, detection);

  panel.webview.postMessage({
    detectionType,
    detection,
    uniqueDetectionId,
  });
};

const _onDidReceiveMessage = async (message: Record<string, string>) => {
  if (message.command !== 'ignoreSecretByValue' || !message.uniqueDetectionId) {
    // TODO(MarshalX): implement other ignore commands
    return;
  }

  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  const scanResult = scanResultsService.getDetectionById(message.uniqueDetectionId);
  if (!scanResult) {
    return;
  }

  const ideData = await getSecretDetectionIdeData(scanResult.detection as SecretDetection);

  vscode.commands.executeCommand(
      VscodeCommands.IgnoreCommandId,
      {
        scanType: ScanType.Secrets,
        ignoreBy: CommandParameters.ByValue,
        param: ideData.value,
        filePath: ideData.documentPath,
      } as IgnoreCommandConfig
  );

  removePanel(ScanType.Secrets);
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
