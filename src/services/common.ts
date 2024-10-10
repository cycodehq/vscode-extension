import * as vscode from 'vscode';
import statusBar from '../utils/status-bar';
import {TrayNotificationTexts} from '../utils/texts';
import {onAuthFailure} from '../utils/auth';
import {ProgressBar} from '../cli-wrapper/types';
import {DIAGNOSTIC_CODE_SEPARATOR, ScanType} from '../constants';
import {container} from 'tsyringe';
import {IScanResultsService} from './scan-results-service';
import {ScanResultsServiceSymbol, StateServiceSymbol} from '../symbols';
import {IStateService} from './state-service';

const _cliBadAuthMessageId = 'client id needed';
const _cliBadAuthMessageSecret = 'client secret needed';

const _showMessage = (text: TrayNotificationTexts, isError: boolean) => {
  const showMessageFunc = isError ? vscode.window.showErrorMessage : vscode.window.showInformationMessage;
  showMessageFunc(text);
};

export const validateCliCommonErrors = (
    error: string,
): boolean | string => {
  // Handle non-command specific problems: check for missing CLI, bad auth, etc.
  if (!error) {
    return false;
  }

  if (error.includes('ENOENT')) {
    _showMessage(TrayNotificationTexts.CliNotInstalledError, true);
    statusBar.showCliPathError();
    return 'ENOENT';
  }

  if (error.includes('Aborted')) {
    _showMessage(TrayNotificationTexts.CliCommandHasBeenCanceled, false);
    return 'Aborted';
  }

  if (
    error.includes(_cliBadAuthMessageId) ||
      error.includes(_cliBadAuthMessageSecret)
  ) {
    // update status bar
    onAuthFailure();

    return error;
  }

  return false;
};

export const validateCliCommonScanErrors = (result: any) => {
  // check general response errors
  if (result && result.error) {
    throw new Error(result.message);
  }

  // check scan results errors
  if (result && result.errors?.length) {
    throw new Error(result.errors);
  }
};


export const finalizeScan = (success: boolean, progress?: ProgressBar) => {
  if (success) {
    statusBar.showScanComplete();
  } else {
    statusBar.showScanError();
    vscode.window.showErrorMessage(TrayNotificationTexts.ScanError);
  }

  if (progress) {
    progress.report({increment: 100});
  }
};

export class DiagnosticCode {
  scanType: ScanType;
  uniqueDetectionId: string;

  constructor(scanType: ScanType, uniqueDetectionId: string) {
    this.scanType = scanType;
    this.uniqueDetectionId = uniqueDetectionId;
  }

  toString(): string {
    return `${this.scanType}${DIAGNOSTIC_CODE_SEPARATOR}${this.uniqueDetectionId}`;
  }

  static fromString(diagnosticCode: string): DiagnosticCode {
    const [scanType, ruleId] = diagnosticCode.split(DIAGNOSTIC_CODE_SEPARATOR);
    return new DiagnosticCode(scanType as ScanType, ruleId);
  }
}

export const updateDetectionState = (scanType: ScanType) => {
  const stateService = container.resolve<IStateService>(StateServiceSymbol);
  const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);
  const detections = scanResultsService.getDetections(scanType);

  const hasDetections = detections.length > 0;
  if (hasDetections) {
    stateService.localState.TreeViewIsOpen = true;
  }

  stateService.localState.HasAnyDetections =
      scanResultsService.getDetections(ScanType.Secrets).length > 0 ||
      scanResultsService.getDetections(ScanType.Sca).length > 0 ||
      scanResultsService.getDetections(ScanType.Iac).length > 0 ||
      scanResultsService.getDetections(ScanType.Sast).length > 0;

  stateService.save();
};
