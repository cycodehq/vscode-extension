import * as vscode from 'vscode';
import {extensionOutput} from '../../logging/extension-output';
import {cliWrapper} from '../../cli-wrapper/cli-wrapper';
import statusBar from '../../utils/status-bar';
import {extensionId, StatusBarTexts, TrayNotificationTexts} from '../../utils/texts';
import {
  DiagnosticCode,
  finalizeScanState,
  updateDetectionState,
  validateCliCommonErrors,
  validateCliCommonScanErrors,
} from '../common';
import {getWorkspaceState, updateWorkspaceState} from '../../utils/context';
import {SastDetection} from '../../types/detection';
import {IConfig, ProgressBar, RunCliResult} from '../../cli-wrapper/types';
import TrayNotifications from '../../utils/TrayNotifications';
import {refreshTreeViewData} from '../../providers/tree-view/utils';
import {TreeView} from '../../providers/tree-view/types';
import {ScanType} from '../../constants';
import {VscodeStates} from '../../utils/states';
import {calculateUniqueDetectionId, scanResultsService} from '../ScanResultsService';

interface SastScanParams {
  pathToScan: string;
  workspaceFolderPath?: string;
  diagnosticCollection: vscode.DiagnosticCollection;
  config: IConfig;
  onDemand?: boolean;
}

export const sastScan = (
    params: SastScanParams,
    treeView?: TreeView,
) => {
  // we are showing progress bar only for on-demand scans
  if (!params.onDemand) {
    _sastScan(params, undefined, undefined, treeView);
    return;
  }

  vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        await _sastScan(params, progress, token, treeView);
      },
  );
};

const _getRunnableCliSastScan = (params: SastScanParams): RunCliResult => {
  const cliParams = {
    path: params.pathToScan,
    workspaceFolderPath: params.workspaceFolderPath,
    config: params.config,
  };

  return cliWrapper.getRunnableSastScanCommand(cliParams);
};

const _initScanState = (params: SastScanParams, progress?: ProgressBar) => {
  extensionOutput.info(StatusBarTexts.ScanWait);
  extensionOutput.info('Initiating SAST scan for file: ' + params.pathToScan);

  statusBar.showScanningInProgress();
  updateWorkspaceState(VscodeStates.SastScanInProgress, true);

  progress?.report({
    message: `SAST scanning ${params.pathToScan}...`,
  });
};

const normalizeSastDetections = (result: { detections?: SastDetection[] }): SastDetection[] => {
  if (!result || !result.detections) {
    return [];
  }

  for (const detection of result.detections) {
    const {detection_details} = detection;

    if (!detection_details.file_path.startsWith('/')) {
      detection_details.file_path = '/' + detection_details.file_path;
    }

    detection_details.description = detection.message;
    detection.message = detection.message.slice(0, 50) + '...';
  }

  return result.detections;
};

export async function _sastScan(
    params: SastScanParams,
    progress?: ProgressBar,
    cancellationToken?: vscode.CancellationToken,
    treeView?: TreeView,
) {
  try {
    if (getWorkspaceState(VscodeStates.SastScanInProgress)) {
      return;
    }

    if (!params.pathToScan) {
      return;
    }

    _initScanState(params, progress);

    const runnableSastScan = _getRunnableCliSastScan(params);

    cancellationToken?.onCancellationRequested(async () => {
      await runnableSastScan.getCancelPromise();
      finalizeScanState(VscodeStates.SastScanInProgress, true, progress);
    });

    const scanResult = await runnableSastScan.getResultPromise();
    const {result, stderr} = scanResult;

    updateWorkspaceState(VscodeStates.SastScanInProgress, false);

    if (validateCliCommonErrors(stderr)) {
      return;
    }
    validateCliCommonScanErrors(result);

    // Show in "problems" tab
    await handleScanDetections(
        normalizeSastDetections(result),
        params.diagnosticCollection,
        treeView
    );

    finalizeScanState(VscodeStates.SastScanInProgress, true, progress);
  } catch (error: any) {
    finalizeScanState(VscodeStates.SastScanInProgress, false, progress);

    let notificationText: string = TrayNotificationTexts.ScanError;
    if (error.message !== undefined) {
      notificationText = `${TrayNotificationTexts.ScanError}. ${error.message}`;
    }
    vscode.window.showErrorMessage(notificationText);

    extensionOutput.error('Error while creating scan: ' + error);
  }
}

const detectionsToDiagnostics = async (
    detections: SastDetection[],
): Promise<Record<string, vscode.Diagnostic[]>> => {
  const result: Record<string, vscode.Diagnostic[]> = {};

  for (const detection of detections) {
    const {detection_details} = detection;

    const documentPath = detection_details.file_path;
    const documentUri = vscode.Uri.file(documentPath);
    const document = await vscode.workspace.openTextDocument(documentUri);

    let message = `Severity: ${detection.severity}\n`;
    message += `Description: ${detection.message}\n`;
    message += `In file: ${detection.detection_details.file_name}\n`;

    const diagnostic = new vscode.Diagnostic(
        document.lineAt(detection_details.line_in_file - 1).range,
        message,
        vscode.DiagnosticSeverity.Error
    );

    diagnostic.source = extensionId;
    diagnostic.code = new DiagnosticCode(ScanType.Sast, calculateUniqueDetectionId(detection)).toString();

    result[documentPath] = result[documentPath] || [];
    result[documentPath].push(diagnostic);
  }

  return result;
};

const handleScanDetections = async (
    detections: SastDetection[],
    diagnosticCollection: vscode.DiagnosticCollection,
    treeView?: TreeView
) => {
  const hasDetections = detections.length > 0;
  updateDetectionState(ScanType.Sast, detections);

  const diagnostics = await detectionsToDiagnostics(detections) || [];
  for (const [filePath, fileDiagnostics] of Object.entries(diagnostics)) {
    const uri = vscode.Uri.file(filePath);
    diagnosticCollection.set(uri, fileDiagnostics); // Show in "problems" tab
  }

  if (hasDetections && !getWorkspaceState(VscodeStates.NotificationIsOpen)) {
    updateWorkspaceState(VscodeStates.NotificationIsOpen, true);
    TrayNotifications.showProblemsDetection(detections.length, ScanType.Sast);
  }

  scanResultsService.saveDetections(ScanType.Sast, detections);

  refreshTreeViewData({
    detections,
    treeView: treeView,
    scanType: ScanType.Sast,
  });
};
