import * as vscode from 'vscode';
import { container } from 'tsyringe';
import content from './content';
import { createPanel, getPanel, removePanel, revealPanel } from './panel-manager';
import { calculateUniqueDetectionId, IScanResultsService } from '../../../services/scan-results-service';
import { getDetectionForRender, getMarkdownForRender } from './rendered-detection';
import { VscodeCommands } from '../../../commands';
import { CycodeServiceSymbol, LoggerServiceSymbol, ScanResultsServiceSymbol } from '../../../symbols';
import { DetectionBase } from '../../../cli/models/scan-result/detection-base';
import { SecretDetection } from '../../../cli/models/scan-result/secret/secret-detection';
import { CliIgnoreType } from '../../../cli/models/cli-ignore-type';
import { CliScanType } from '../../../cli/models/cli-scan-type';
import { ILoggerService } from '../../../services/logger-service';
import { ICycodeService } from '../../../services/cycode-service';

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

const _ignoreCommandHandler = async (message: Record<string, string>) => {
  if (message.command !== 'ignoreSecretByValue' || !message.uniqueDetectionId) {
    // TODO(MarshalX): implement other ignore commands
    return;
  }

  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  const detection = scanResultsService.getDetectionById(message.uniqueDetectionId);
  if (!detection) {
    return;
  }

  removePanel(CliScanType.Secret);

  await vscode.commands.executeCommand(
    VscodeCommands.IgnoreCommandId,
    CliScanType.Secret,
    CliIgnoreType.Value,
    (detection as SecretDetection).detectionDetails.detectedValue,
  );
};

const _readyCommandHandler = (onLoadResolve: (value: boolean) => void) => {
  /*
   * the webview is ready to receive messages
   * it works even without it in VS Code, but Theia behaves differently and do not wait until scripts are loaded
   */
  onLoadResolve(true);
};

const _extractAiRemediationParts = (remediation: string) => {
  // this function was burn during quick win, it is not perfect and may fail in some cases

  const regex = /^([\s\S]*?)```\s*diff([\s\S]*?)```$/m;
  const matches = regex.exec(remediation);

  if (matches) {
    // Group 1: Remediation markdown
    const remediationMarkdown = matches[1].trim();
    // Group 2: unify diff
    const unifyDiff = matches[2].trim();

    return {
      remediationMarkdown,
      unifyDiff,
    };
  }

  return undefined;
};

const _getAiRemediationHandler = async (panel: vscode.WebviewPanel, uniqueDetectionId: string) => {
  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  const detection = scanResultsService.getDetectionById(uniqueDetectionId);
  if (!detection) {
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeServiceSymbol);
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);
  const aiRemediation = await cycodeService.getAiRemediation(detection.id);
  if (!aiRemediation) {
    logger.error('Failed to get AI remediation');
    return;
  }

  let remediationMarkdown = aiRemediation.remediation;
  let unifyDiff = undefined;

  const remediationParts = _extractAiRemediationParts(aiRemediation.remediation);
  if (remediationParts) {
    remediationMarkdown = remediationParts.remediationMarkdown;
    unifyDiff = remediationParts.unifyDiff;
  }

  const sendRes = await panel.webview.postMessage({
    aiRemediation: {
      remediation: getMarkdownForRender(remediationMarkdown),
      unifyDiff: unifyDiff,
      isFixAvailable: aiRemediation.isFixAvailable,
    },
  });
  if (!sendRes) {
    logger.error('Failed to send AI Remediation to render on the violation card');
  }
};

const _getOnDidReceiveMessage = (panel: vscode.WebviewPanel, onLoadResolve: (value: boolean) => void) => {
  return async (message: Record<string, string>) => {
    switch (message.command) {
      case 'ready':
        _readyCommandHandler(onLoadResolve);
        break;
      case 'ignoreSecretByValue':
        await _ignoreCommandHandler(message);
        break;
      case 'getAiRemediation':
        await _getAiRemediationHandler(panel, message.uniqueDetectionId);
        break;
      default:
        break;
    }
  };
};

const _initPanel = async (scanType: CliScanType, panel: vscode.WebviewPanel, context?: vscode.ExtensionContext) => {
  // the promise is resolved when the webview is ready to receive messages
  await new Promise((resolve) => {
    let subscriptions;
    if (context) {
      subscriptions = context.subscriptions;
    }

    panel.webview.onDidReceiveMessage(_getOnDidReceiveMessage(panel, resolve));
    panel.webview.html = content(scanType);
    panel.onDidDispose(
      () => {
        removePanel(scanType);
      },
      null,
      subscriptions,
    );
  });
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
    await _initPanel(scanType, panel, context); // awaits script loading
  }

  await _sendSeverityIconsToRender(scanType, context);
  await _sendDetectionToRender(scanType, detection);

  return panel;
};
