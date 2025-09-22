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
import { ScaDetection } from '../../../cli/models/scan-result/sca/sca-detection';

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

interface _CommandMappingAction {
  scanType: CliScanType;
  ignoreType: CliIgnoreType;
  getIgnoreValue: (detection: DetectionBase) => string | undefined;
}

const _ignoreCommandMapping: Record<string, _CommandMappingAction> = {
  ignoreSecretByValue: {
    scanType: CliScanType.Secret,
    ignoreType: CliIgnoreType.Value,
    getIgnoreValue: (detection: DetectionBase) => (detection as SecretDetection).detectionDetails.detectedValue,
  },
  ignoreScaByCve: {
    scanType: CliScanType.Sca,
    ignoreType: CliIgnoreType.Cve,
    getIgnoreValue: (detection: DetectionBase) => (detection as ScaDetection).detectionDetails.alert?.cveIdentifier,
  },
};

const _ignoreCommandHandler = async (message: Record<string, string>) => {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);
  if (!message.uniqueDetectionId) {
    logger.error('Unique detection id is missing in ignore command');
    return;
  }

  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  const detection = scanResultsService.getDetectionById(message.uniqueDetectionId);
  if (!detection) {
    return;
  }

  const commandInfo = _ignoreCommandMapping[message.command];
  if (!commandInfo) {
    logger.error('Unknown ignore command');
    return;
  }

  removePanel(commandInfo.scanType);
  await vscode.commands.executeCommand(
    VscodeCommands.IgnoreCommandId, commandInfo.scanType, commandInfo.ignoreType, commandInfo.getIgnoreValue(detection),
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

const _sendCommandCompletionMessage = async (panel: vscode.WebviewPanel, command: string, success: boolean) => {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);
  const sendRes = await panel.webview.postMessage({
    command: command,
    finished: success,
  });
  if (!sendRes) {
    logger.error(`Failed to send command completion message for ${command}`);
  }
};

const _getAiRemediationHandler = async (panel: vscode.WebviewPanel, uniqueDetectionId: string) => {
  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  const detection = scanResultsService.getDetectionById(uniqueDetectionId);
  if (!detection) {
    await _sendCommandCompletionMessage(panel, 'getAiRemediation', false);
    return;
  }

  const cycodeService = container.resolve<ICycodeService>(CycodeServiceSymbol);
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);

  try {
    const aiRemediation = await cycodeService.getAiRemediation(detection.id);
    if (!aiRemediation) {
      logger.error('Failed to get AI remediation');
      await _sendCommandCompletionMessage(panel, 'getAiRemediation', false);
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
      command: 'getAiRemediation',
      finished: true,
      aiRemediation: {
        remediation: getMarkdownForRender(remediationMarkdown),
        unifyDiff: unifyDiff,
        isFixAvailable: aiRemediation.isFixAvailable,
      },
    });

    if (!sendRes) {
      logger.error('Failed to send AI Remediation to render on the violation card');
    }
  } catch (error) {
    logger.error(`Error in AI remediation handler: ${error}`);
    await _sendCommandCompletionMessage(panel, 'getAiRemediation', false);
  }
};

const _applyAiSuggestedFixHandler = async (panel: vscode.WebviewPanel, uniqueDetectionId: string) => {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);

  try {
    /*
     * TODO: Implement actual AI fix application when CLI command is ready
     * For now, simulate the operation with a delay
     */
    logger.debug(`[AI FIX] Start applying AI suggested fix for ${uniqueDetectionId}`);

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // For now, just log that the fix would be applied
    logger.debug(`[AI FIX] Finish applying AI suggested fix for ${uniqueDetectionId}`);

    // Send the success completion message
    await _sendCommandCompletionMessage(panel, 'applyAiSuggestedFix', true);
  } catch (error) {
    logger.error(`Error in AI fix handler: ${error}`);
    await _sendCommandCompletionMessage(panel, 'applyAiSuggestedFix', false);
  }
};

const _getOnDidReceiveMessage = (panel: vscode.WebviewPanel, onLoadResolve: (value: boolean) => void) => {
  return async (message: Record<string, string>) => {
    if (!message.command) {
      return;
    }

    if (message.command == 'getAiRemediation') {
      await _getAiRemediationHandler(panel, message.uniqueDetectionId);
    } else if (message.command == 'applyAiSuggestedFix') {
      await _applyAiSuggestedFixHandler(panel, message.uniqueDetectionId);
    } else if (message.command == 'ready') {
      _readyCommandHandler(onLoadResolve);
    } else if (message.command.startsWith('ignore')) {
      await _ignoreCommandHandler(message);
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
