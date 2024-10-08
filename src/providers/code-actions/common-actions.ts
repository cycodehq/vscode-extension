import * as vscode from 'vscode';
import {DiagnosticCode} from '../../services/common';
import {VscodeCommands} from '../../commands';
import {AnyDetection, IacDetection, SastDetection, ScaDetection, SecretDetection} from '../../types/detection';
import {ScanType} from '../../constants';
import {container} from 'tsyringe';
import {IScanResultsService} from '../../services/scan-results-service';
import {ScanResultsServiceSymbol} from '../../symbols';

const _getOpenViolationCardActionSastTitle = (detection: SastDetection) => {
  return detection?.detection_details.policy_display_name;
};

const _getOpenViolationCardActionIacTitle = (detection: IacDetection) => {
  return detection?.message;
};

const _getOpenViolationCardActionScaTitle = (detection: ScaDetection) => {
  let description = detection.detection_details.vulnerability_description;
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
    detection: AnyDetection, diagnosticCode: DiagnosticCode
): string => {
  switch (diagnosticCode.scanType) {
    case ScanType.Sast:
      return _getOpenViolationCardActionSastTitle(detection as SastDetection);
    case ScanType.Secrets:
      return _getOpenViolationCardActionSecretTitle(detection as SecretDetection);
    case ScanType.Sca:
      return _getOpenViolationCardActionScaTitle(detection as ScaDetection);
    case ScanType.Iac:
      return _getOpenViolationCardActionIacTitle(detection as IacDetection);
    default:
      return detection?.message;
  }
};

const _getOpenViolationCardActionTitle = (
    detection: AnyDetection, diagnosticCode: DiagnosticCode
): string => {
  let title = _getOpenViolationCardActionDetectionSpecificTitle(detection, diagnosticCode);

  // cut too long messages
  if (title && title.length > 50) {
    title = title.slice(0, 50) + '...';
  }

  // Cut too long ID.
  // The original unique ID is 2 ** 64 combinations (16 characters).
  // We cut it to 6 characters to make it more readable.
  // It gives as 2 ** 24 combinations that are still enough to be collision-free.
  // Because it's super rare to have the same detections in the same file in the same text range.
  const uniqueDetectionId = diagnosticCode.uniqueDetectionId.slice(0, 6);

  return `Cycode: ${title} (${uniqueDetectionId})`;
};

export const createOpenViolationCardAction = (
    diagnostics: vscode.Diagnostic[], diagnosticCode: DiagnosticCode
): vscode.CodeAction => {
  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  const scanResult = scanResultsService.getDetectionById(diagnosticCode.uniqueDetectionId);
  if (!scanResult) {
    throw new Error(`Detection with id ${diagnosticCode.uniqueDetectionId} not found`);
  }

  const title = _getOpenViolationCardActionTitle(scanResult.detection, diagnosticCode);

  const openViolationCardAction = new vscode.CodeAction(
      title, vscode.CodeActionKind.QuickFix
  );
  openViolationCardAction.command = {
    command: VscodeCommands.OpenViolationPanel,
    title: title,
    tooltip: 'This will open violation card for this detection',
    arguments: [
      diagnosticCode.scanType,
      scanResult.detection,
    ],
  };
  openViolationCardAction.diagnostics = diagnostics;
  openViolationCardAction.isPreferred = true;

  return openViolationCardAction;
};
