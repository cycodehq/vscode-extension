import * as vscode from 'vscode';
import * as path from 'path';
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
import {IacDetection} from '../../types/detection';
import {IConfig, ProgressBar, RunCliResult} from '../../cli-wrapper/types';
import TrayNotifications from '../../utils/TrayNotifications';
import {refreshTreeViewData} from '../../providers/tree-view/utils';
import {TreeView} from '../../providers/tree-view/types';
import {ScanType} from '../../constants';
import {VscodeStates} from '../../utils/states';
import {calculateUniqueDetectionId, scanResultsService} from '../ScanResultsService';

interface IacScanParams {
  pathToScan: string;
  workspaceFolderPath?: string;
  diagnosticCollection: vscode.DiagnosticCollection;
  config: IConfig;
  onDemand?: boolean;
}

export const iacScan = (
    params: IacScanParams,
    treeView?: TreeView,
) => {
  // we are showing progress bar only for on-demand scans
  if (!params.onDemand) {
    _iacScan(params, undefined, undefined, treeView);
    return;
  }

  vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        await _iacScan(params, progress, token, treeView);
      },
  );
};

const _getRunnableCliIacScan = (params: IacScanParams): RunCliResult => {
  const cliParams = {
    path: params.pathToScan,
    workspaceFolderPath: params.workspaceFolderPath,
    config: params.config,
  };

  return cliWrapper.getRunnableIacScanCommand(cliParams);
};

const _initScanState = (params: IacScanParams, progress?: ProgressBar) => {
  extensionOutput.info(StatusBarTexts.ScanWait);
  extensionOutput.info('Initiating IaC scan for file: ' + params.pathToScan);

  statusBar.showScanningInProgress();
  updateWorkspaceState(VscodeStates.IacScanInProgress, true);

  progress?.report({
    message: `IaC scanning ${params.pathToScan}...`,
  });
};

const filterUnsupportedIacDetections = (result: { detections?: IacDetection[] }): IacDetection[] => {
  const filteredResult: IacDetection[] = [];

  if (!result || !result.detections) {
    return filteredResult;
  }

  for (const detection of result.detections) {
    const {detection_details} = detection;

    // TF plans are virtual files what is not exist in the file system
    // "file_name": "1711298252-/Users/ilyasiamionau/projects/cycode/ilya-siamionau-payloads/tfplan.tf",
    // skip such detections
    if (!detection_details.file_name.startsWith('/')) {
      continue;
    }

    filteredResult.push(detection);
  }

  return filteredResult;
};

export async function _iacScan(
    params: IacScanParams,
    progress?: ProgressBar,
    cancellationToken?: vscode.CancellationToken,
    treeView?: TreeView,
) {
  try {
    if (getWorkspaceState(VscodeStates.IacScanInProgress)) {
      return;
    }

    if (!params.pathToScan) {
      return;
    }

    _initScanState(params, progress);

    const runnableIacScan = _getRunnableCliIacScan(params);

    cancellationToken?.onCancellationRequested(async () => {
      await runnableIacScan.getCancelPromise();
      finalizeScanState(VscodeStates.IacScanInProgress, true, progress);
    });

    const scanResult = await runnableIacScan.getResultPromise();
    const {result, stderr} = scanResult;

    updateWorkspaceState(VscodeStates.IacScanInProgress, false);

    if (validateCliCommonErrors(stderr)) {
      return;
    }
    validateCliCommonScanErrors(result);

    // Show in "problems" tab
    await handleScanDetections(
        filterUnsupportedIacDetections(result),
        params.diagnosticCollection,
        treeView
    );

    finalizeScanState(VscodeStates.IacScanInProgress, true, progress);
  } catch (error: any) {
    finalizeScanState(VscodeStates.IacScanInProgress, false, progress);

    let notificationText: string = TrayNotificationTexts.ScanError;
    if (error.message !== undefined) {
      notificationText = `${TrayNotificationTexts.ScanError}. ${error.message}`;
    }
    vscode.window.showErrorMessage(notificationText);

    extensionOutput.error('Error while creating scan: ' + error);
  }
}

const detectionsToDiagnostics = async (
    detections: IacDetection[],
): Promise<Record<string, vscode.Diagnostic[]>> => {
  const result: Record<string, vscode.Diagnostic[]> = {};

  for (const detection of detections) {
    const {detection_details} = detection;

    const documentPath = detection_details.file_name;
    const documentUri = vscode.Uri.file(documentPath);
    const document = await vscode.workspace.openTextDocument(documentUri);

    let message = `Severity: ${detection.severity}\n`;
    message += `Rule: ${detection.message}\n`;

    message += `IaC Provider: ${detection.detection_details.infra_provider}\n`;

    const fileName = path.basename(detection.detection_details.file_name);
    message += `In file: ${fileName}\n`;

    const diagnostic = new vscode.Diagnostic(
        document.lineAt(detection_details.line_in_file - 1).range,
        message,
        vscode.DiagnosticSeverity.Error
    );

    diagnostic.source = extensionId;
    diagnostic.code = new DiagnosticCode(ScanType.Iac, calculateUniqueDetectionId(detection)).toString();

    result[documentPath] = result[documentPath] || [];
    result[documentPath].push(diagnostic);
  }

  return result;
};

const handleScanDetections = async (
    detections: IacDetection[],
    diagnosticCollection: vscode.DiagnosticCollection,
    treeView?: TreeView
) => {
  const hasDetections = detections.length > 0;
  updateDetectionState(ScanType.Iac, detections);

  const diagnostics = await detectionsToDiagnostics(detections) || [];
  for (const [filePath, fileDiagnostics] of Object.entries(diagnostics)) {
    const uri = vscode.Uri.file(filePath);
    diagnosticCollection.set(uri, fileDiagnostics); // Show in "problems" tab
  }

  if (hasDetections && !getWorkspaceState(VscodeStates.NotificationIsOpen)) {
    updateWorkspaceState(VscodeStates.NotificationIsOpen, true);
    TrayNotifications.showProblemsDetection(detections.length, ScanType.Iac);
  }

  scanResultsService.saveDetections(ScanType.Iac, detections);

  refreshTreeViewData({
    detections,
    treeView: treeView,
    scanType: ScanType.Iac,
  });
};
