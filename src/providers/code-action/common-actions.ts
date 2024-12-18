import * as vscode from 'vscode';
import { DiagnosticCode } from '../../utils/diagnostic-code';
import { VscodeCommands } from '../../commands';
import { container } from 'tsyringe';
import { LoggerServiceSymbol, ScanResultsServiceSymbol } from '../../symbols';
import { IScanResultsService } from '../../services/scan-results-service';
import { ILoggerService } from '../../services/logger-service';
import { DetectionBase } from '../../cli/models/scan-result/detection-base';
import { SastDetection } from '../../cli/models/scan-result/sast/sast-detection';
import { SecretDetection } from '../../cli/models/scan-result/secret/secret-detection';
import { ScaDetection } from '../../cli/models/scan-result/sca/sca-detection';
import { IacDetection } from '../../cli/models/scan-result/iac/iac-detection';
import { CliScanType } from '../../cli/models/cli-scan-type';

const _getOpenViolationCardActionSastTitle = (detection: SastDetection) => {
  return detection.detectionDetails.policyDisplayName;
};

const _getOpenViolationCardActionIacTitle = (detection: IacDetection) => {
  return detection.message;
};

const _getOpenViolationCardActionScaTitle = (detection: ScaDetection) => {
  let description = detection.detectionDetails.vulnerabilityDescription;
  if (!description) {
    // if detection is about non-premise licence
    description = detection.message;
  }

  return description;
};

const _getOpenViolationCardActionSecretTitle = (detection: SecretDetection) => {
  return `a hardcoded ${detection.type} is used`;
};

const _getOpenViolationCardActionDetectionSpecificTitle = (
  detection: DetectionBase, diagnosticCode: DiagnosticCode,
): string => {
  const scanTypeHandlers = {
    [CliScanType.Sast]: () => _getOpenViolationCardActionSastTitle(detection as SastDetection),
    [CliScanType.Secret]: () => _getOpenViolationCardActionSecretTitle(detection as SecretDetection),
    [CliScanType.Sca]: () => _getOpenViolationCardActionScaTitle(detection as ScaDetection),
    [CliScanType.Iac]: () => _getOpenViolationCardActionIacTitle(detection as IacDetection),
  };

  const handler = scanTypeHandlers[diagnosticCode.scanType];
  if (!handler) {
    throw new Error('Unsupported scan type');
  }

  return handler();
};

const _getOpenViolationCardActionTitle = (
  detection: DetectionBase, diagnosticCode: DiagnosticCode,
): string => {
  let title = _getOpenViolationCardActionDetectionSpecificTitle(detection, diagnosticCode);

  // cut too long messages
  if (title && title.length > 50) {
    title = title.slice(0, 50) + '...';
  }

  /*
   * Cut too long ID.
   * The original unique ID is 2 ** 64 combinations (16 characters).
   * We cut it to 6 characters to make it more readable.
   * It gives as 2 ** 24 combinations that are still enough to be collision-free.
   * Because it's super rare to have the same detections in the same file in the same text range.
   */
  const uniqueDetectionId = diagnosticCode.uniqueDetectionId.slice(0, 6);

  return `Cycode: ${title} (${uniqueDetectionId})`;
};

export const createOpenViolationCardAction = (
  diagnostics: vscode.Diagnostic[], diagnosticCode: DiagnosticCode,
): vscode.CodeAction => {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);
  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);

  const detection = scanResultsService.getDetectionById(diagnosticCode.uniqueDetectionId);
  if (!detection) {
    const msg = `Detection with id ${diagnosticCode.uniqueDetectionId} not found`;
    logger.error(msg);
    throw new Error(msg);
  }

  const title = _getOpenViolationCardActionTitle(detection, diagnosticCode);
  const openViolationCardAction = new vscode.CodeAction(
    title, vscode.CodeActionKind.QuickFix,
  );
  openViolationCardAction.command = {
    command: VscodeCommands.OpenViolationPanel,
    title: title,
    tooltip: 'This will open violation card for this detection',
    arguments: [
      diagnosticCode.scanType,
      detection,
    ],
  };
  openViolationCardAction.diagnostics = diagnostics;
  openViolationCardAction.isPreferred = true;

  return openViolationCardAction;
};
