import * as path from 'path';
import * as vscode from 'vscode';
import {extensionOutput} from '../../logging/extension-output';
import {cliWrapper} from '../../cli-wrapper/cli-wrapper';
import statusBar from '../../utils/status-bar';
import {extensionId, StatusBarTexts, TrayNotificationTexts} from '../../utils/texts';
import {
  finalizeScanState,
  DiagnosticCode,
  validateCliCommonErrors,
  validateCliCommonScanErrors,
  updateDetectionState,
} from '../common';
import {getWorkspaceState, updateWorkspaceState} from '../../utils/context';
import {SecretDetection} from '../../types/detection';
import {IConfig, ProgressBar, RunCliResult} from '../../cli-wrapper/types';
import TrayNotifications from '../../utils/TrayNotifications';
import {refreshTreeViewData} from '../../providers/tree-view/utils';
import {TreeView} from '../../providers/tree-view/types';
import {ScanType} from '../../constants';
import {VscodeStates} from '../../utils/states';

interface SecretScanParams {
  pathToScan: string;
  workspaceFolderPath?: string;
  diagnosticCollection: vscode.DiagnosticCollection;
  config: IConfig;
  onDemand?: boolean;
}

export const secretScan = (
    params: SecretScanParams,
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

const _getRunnableCliSecretScan = (params: SecretScanParams): RunCliResult => {
  const cliParams = {
    path: params.pathToScan,
    workspaceFolderPath: params.workspaceFolderPath,
    config: params.config,
  };

  return cliWrapper.getRunnableSecretScanCommand(cliParams);
};

const _initScanState = (params: SecretScanParams, progress?: ProgressBar) => {
  extensionOutput.info(StatusBarTexts.ScanWait);
  extensionOutput.info('Initiating scan for file: ' + params.pathToScan);

  statusBar.showScanningInProgress();
  updateWorkspaceState(VscodeStates.SecretsScanInProgress, true);

  progress?.report({
    message: `Secrets scanning ${params.pathToScan}...`,
  });
};

export async function _secretScan(
    params: SecretScanParams,
    progress?: ProgressBar,
    cancellationToken?: vscode.CancellationToken,
    treeView?: TreeView,
) {
  try {
    if (getWorkspaceState(VscodeStates.SecretsScanInProgress)) {
      return;
    }

    if (!params.pathToScan) {
      return;
    }

    _initScanState(params, progress);

    const runnableSecretScan = _getRunnableCliSecretScan(params);

    cancellationToken?.onCancellationRequested(async () => {
      await runnableSecretScan.getCancelPromise();
      finalizeScanState(VscodeStates.SecretsScanInProgress, true, progress);
    });

    const scanResult = await runnableSecretScan.getResultPromise();
    const {result, stderr} = scanResult;

    updateWorkspaceState(VscodeStates.SecretsScanInProgress, false);

    if (validateCliCommonErrors(stderr)) {
      return;
    }
    validateCliCommonScanErrors(result);

    // Show in "problems" tab
    await handleScanDetections(
        result,
        params.diagnosticCollection,
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

const detectionsToDiagnostics = async (
    detections: SecretDetection[],
): Promise<Record<string, vscode.Diagnostic[]>> => {
  const result: Record<string, vscode.Diagnostic[]> = {};

  for (const detection of detections) {
    const documentPath = path.join(detection.detection_details.file_path, detection.detection_details.file_name);
    const documentUri = vscode.Uri.file(documentPath);
    const document = await vscode.workspace.openTextDocument(documentUri);

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
    message += `In file: ${detection.detection_details.file_name}\n`;
    message += `Secret SHA: ${detection.detection_details.sha512}`;

    const diagnostic = new vscode.Diagnostic(
        new vscode.Range(startPosition, endPosition),
        message,
        vscode.DiagnosticSeverity.Error
    );

    diagnostic.source = extensionId;
    diagnostic.code = new DiagnosticCode(ScanType.Secrets, detection.detection_rule_id).toString();

    result[documentPath] = result[documentPath] || [];
    result[documentPath].push(diagnostic);
  }

  return result;
};

const handleScanDetections = async (
    result: { detections?: SecretDetection[] },
    diagnosticCollection: vscode.DiagnosticCollection,
    treeView?: TreeView
) => {
  const {detections} = result;
  if (detections === undefined) {
    return;
  }

  updateDetectionState(ScanType.Secrets, detections);

  const diagnostics = await detectionsToDiagnostics(detections) || [];
  for (const [filePath, fileDiagnostics] of Object.entries(diagnostics)) {
    const uri = vscode.Uri.file(filePath);
    diagnosticCollection.set(uri, fileDiagnostics); // Show in "problems" tab
  }

  if (result.detections?.length && !getWorkspaceState(VscodeStates.NotificationIsOpen)) {
    updateWorkspaceState(VscodeStates.NotificationIsOpen, true);
    TrayNotifications.showProblemsDetection(result.detections.length, ScanType.Secrets);
  }

  refreshTreeViewData({
    detections,
    treeView: treeView,
    scanType: ScanType.Secrets,
  });
};
