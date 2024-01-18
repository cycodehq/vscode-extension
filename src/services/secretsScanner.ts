import * as vscode from 'vscode';
import {extensionOutput} from '../logging/extension-output';
import {cliWrapper} from '../cli-wrapper/cli-wrapper';
import statusBar from '../utils/status-bar';
import {extensionId, StatusBarTexts, TrayNotificationTexts} from '../utils/texts';
import {finalizeScanState, DiagnosticCode, validateCliCommonErrors, validateCliCommonScanErrors} from './common';
import {getWorkspaceState, setContext, updateWorkspaceState} from '../utils/context';
import {Detection} from '../types/detection';
import {IConfig, ProgressBar, RunCliResult} from '../cli-wrapper/types';
import TrayNotifications from '../utils/TrayNotifications';
import {refreshTreeViewData} from '../providers/tree-view/utils';
import {TreeView} from '../providers/tree-view/types';
import {ScanType} from '../constants';
import {VscodeStates} from '../utils/states';

interface SecretsScanParams {
  documentToScan: vscode.TextDocument;
  workspaceFolderPath?: string;
  diagnosticCollection: vscode.DiagnosticCollection;
  config: IConfig;
  onDemand?: boolean;
}

export const secretScan = (
    params: SecretsScanParams,
    treeView?: TreeView,
) => {
  // we are showing progress bar only for on-demand scans
  if (!params.onDemand) {
    _secretScan(params, undefined, undefined, treeView);
    return;
  }

  vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        await _secretScan(params, progress, token, treeView);
      },
  );
};

const _getRunnableCliSecretsScan = (params: SecretsScanParams): RunCliResult => {
  const cliParams = {
    path: params.documentToScan.fileName,
    workspaceFolderPath: params.workspaceFolderPath,
    config: params.config,
  };

  return cliWrapper.getRunnableSecretsScanCommand(cliParams);
};

const _initScanState = (params: SecretsScanParams, progress?: ProgressBar) => {
  extensionOutput.info(StatusBarTexts.ScanWait);
  extensionOutput.info('Initiating scan for file: ' + params.documentToScan.fileName);

  statusBar.showScanningInProgress();
  updateWorkspaceState(VscodeStates.SecretsScanInProgress, true);

  progress?.report({
    message: `Secrets scanning ${params.documentToScan.fileName}...`,
  });
};

export async function _secretScan(
    params: SecretsScanParams,
    progress?: ProgressBar,
    cancellationToken?: vscode.CancellationToken,
    treeView?: TreeView,
) {
  try {
    if (getWorkspaceState(VscodeStates.SecretsScanInProgress)) {
      return;
    }

    // TODO (MarshalX): support folder support
    if (!params.documentToScan) {
      return;
    }

    _initScanState(params, progress);

    const runnableSecretsScan = _getRunnableCliSecretsScan(params);

    cancellationToken?.onCancellationRequested(async () => {
      await runnableSecretsScan.getCancelPromise();
      finalizeScanState(VscodeStates.SecretsScanInProgress, true, progress);
    });

    const scanResult = await runnableSecretsScan.getResultPromise();
    const {result, stderr} = scanResult;

    updateWorkspaceState(VscodeStates.SecretsScanInProgress, false);

    if (validateCliCommonErrors(stderr)) {
      return;
    }
    validateCliCommonScanErrors(result);

    // Show in "problems" tab
    handleScanDetections(
        result,
        params.documentToScan.fileName,
        params.diagnosticCollection,
        params.documentToScan,
        treeView
    );

    finalizeScanState(VscodeStates.SecretsScanInProgress, true, progress);
  } catch (error: any) {
    finalizeScanState(VscodeStates.SecretsScanInProgress, false, progress);

    let notificationText: string = TrayNotificationTexts.ScanError;
    if (error.message !== undefined) {
      notificationText = `${TrayNotificationTexts.ScanError}. ${error.message}`;
    }
    vscode.window.showErrorMessage(notificationText);

    extensionOutput.error('Error while creating scan: ' + error);
  }
}

export const detectionsToDiagnostics = (
    detections: Detection[],
    document: vscode.TextDocument
): vscode.Diagnostic[] => {
  const diagnotics: vscode.Diagnostic[] = [];

  for (const detection of detections) {
    const startPosition = document?.positionAt(
        detection.detection_details.start_position
    );

    const endPosition = document?.positionAt(
        detection.detection_details.start_position +
      detection.detection_details.length
    );

    if (!startPosition || !endPosition) {
      continue;
    }

    let message = `Severity: ${detection.severity}\n`;
    message += `${detection.type}: ${detection.message.replace(
        'within \'\' repository',
        ''
    )}\n`;
    message += `Rule ID: ${detection.detection_rule_id}\n`;
    message += `In file: ${detection.detection_details.file_name}\n`;
    message += `Secret SHA: ${detection.detection_details.sha512}`;

    if (detection.detection_details.custom_remediation_guidelines) {
      message += `\nCompany Guideline: ${detection.detection_details.custom_remediation_guidelines}`;
    }

    const diagnostic = new vscode.Diagnostic(
        new vscode.Range(startPosition, endPosition),
        message,
        vscode.DiagnosticSeverity.Error
    );

    diagnostic.source = extensionId;
    diagnostic.code = new DiagnosticCode(ScanType.Secrets, detection.detection_rule_id).toString();

    diagnotics.push(diagnostic);
  }

  return diagnotics;
};

const handleScanDetections = (
    result: { detections?: Detection[] },
    filePath: string,
    diagnosticCollection: vscode.DiagnosticCollection,
    document: vscode.TextDocument,
    treeView?: TreeView
) => {
  const {detections} = result;

  if (detections === undefined) {
    return;
  }

  const hasDetections = detections.length > 0;
  setContext(VscodeStates.HasDetections, hasDetections);
  setContext(VscodeStates.TreeViewIsOpen, hasDetections);

  const diagnostics = detectionsToDiagnostics(detections, document) || [];
  const uri = vscode.Uri.file(filePath);
  diagnosticCollection.set(uri, diagnostics); // Show in "problems" tab

  if (!diagnostics.length) {
    return;
  }

  if (detections.length && !getWorkspaceState(VscodeStates.NotificationIsOpen)) {
    updateWorkspaceState(VscodeStates.NotificationIsOpen, true);
    TrayNotifications.showProblemsDetection(diagnostics.length, ScanType.Secrets);
  }

  refreshTreeViewData({
    detections,
    treeView: treeView,
    scanType: ScanType.Secrets,
  });
};
