import * as vscode from 'vscode';
import statusBar from '../utils/status-bar';
import {TrayNotificationTexts} from '../utils/texts';
import {getWorkspaceState, setContext, updateWorkspaceState} from '../utils/context';
import {onAuthFailure} from '../utils/auth/auth_common';
import {getHasDetectionState, VscodeStates} from '../utils/states';
import {ProgressBar} from '../cli-wrapper/types';
import {DIAGNOSTIC_CODE_SEPARATOR, ScanType} from '../constants';
import {AnyDetection} from '../types/detection';

const _cliBadAuthMessageId = 'client id needed';
const _cliBadAuthMessageSecret = 'client secret needed';

const _showMessage = (text: TrayNotificationTexts, isError: boolean) => {
  // TODO(MarshalX): investigate why prev team add limit to only one opened notification at a time
  //  to bypass duplicates?
  //  state key should be hashed by text?
  if (!getWorkspaceState(VscodeStates.NotificationWasShown)) {
    const showMessageFunc = isError ? vscode.window.showErrorMessage : vscode.window.showInformationMessage;
    const thenable = showMessageFunc(text);
    updateWorkspaceState(VscodeStates.NotificationWasShown, true);

    const resetState = () => {
      updateWorkspaceState(VscodeStates.NotificationWasShown, false);
    };
    thenable.then(resetState, resetState);
  }
};

export const validateCliCommonErrors = (
    error: string,
): boolean | string => {
  // Handle non-command specific problems: check for missing CLI, bad auth, etc
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

export const finalizeScanState = (state: VscodeStates, success: boolean, progress?: ProgressBar) => {
  updateWorkspaceState(state, false);

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
  scanType: string;
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

const updateHasDetectionState = (scanType: ScanType, value: boolean) => {
  setContext(getHasDetectionState(scanType), value);

  const hasAnyDetections =
      VscodeStates.HasSecretDetections ||
      VscodeStates.HasScaDetections ||
      VscodeStates.HasIacDetections ||
      VscodeStates.HasSastDetections;

  setContext(VscodeStates.HasDetections, hasAnyDetections);
};

export const updateDetectionState = (scanType: ScanType, detections: AnyDetection[]) => {
  const hasDetections = detections.length > 0;

  updateHasDetectionState(scanType, hasDetections);

  if (hasDetections) {
    setContext(VscodeStates.TreeViewIsOpen, true);
  }
};
