import * as path from 'path';
import * as vscode from 'vscode';
import {extensionOutput} from '../../logging/extension-output';
import {cliWrapper} from '../../cli-wrapper/cli-wrapper';
import statusBar from '../../utils/status-bar';
import {
  StatusBarTexts,
  extensionId,
} from '../../utils/texts';
import {finalizeScanState, DiagnosticCode, validateCliCommonErrors, validateCliCommonScanErrors} from '../common';
import {getWorkspaceState, setContext, updateWorkspaceState} from '../../utils/context';
import {ScaDetection} from '../../types/detection';
import {IConfig, ProgressBar, RunCliResult} from '../../cli-wrapper/types';
import TrayNotifications from '../../utils/TrayNotifications';
import {TreeView} from '../../providers/tree-view/types';
import {refreshTreeViewData} from '../../providers/tree-view/utils';
import {getPackageFileForLockFile, isSupportedLockFile, ScanType} from '../../constants';
import {VscodeStates} from '../../utils/states';

interface ScaScanParams {
  pathToScan: string;
  workspaceFolderPath?: string;
  diagnosticCollection: vscode.DiagnosticCollection;
  config: IConfig;
  onDemand?: boolean;
}

export function scaScan(
    params: ScaScanParams,
    treeView: TreeView,
) {
  if (getWorkspaceState(VscodeStates.ScaScanInProgress)) {
    return;
  }

  if (!params.onDemand) {
    _scaScan(params, undefined, undefined, treeView);
    return;
  }

  vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        await _scaScan(params, progress, token, treeView);
      },
  );
}

const _initScanState = (params: ScaScanParams, progress?: ProgressBar) => {
  extensionOutput.info(StatusBarTexts.ScanWait);
  statusBar.showScanningInProgress();

  extensionOutput.info(
      'Initiating SCA scan for path: ' + params.workspaceFolderPath
  );
  updateWorkspaceState(VscodeStates.ScaScanInProgress, true);

  progress?.report({
    message: `SCA scanning ${params.workspaceFolderPath}...`,
  });
};

const _getRunnableCliScaScan = (params: ScaScanParams): RunCliResult => {
  const cliParams = {
    path: params.pathToScan,
    workspaceFolderPath: params.workspaceFolderPath,
    config: params.config,
  };

  return cliWrapper.getRunnableScaScanCommand(cliParams);
};

const _scaScan = async (
    params: ScaScanParams,
    progress?: ProgressBar,
    cancellationToken?: vscode.CancellationToken,
    treeView?: TreeView
) => {
  try {
    _initScanState(params, progress);

    const runnableScaScan = _getRunnableCliScaScan(params);

    cancellationToken?.onCancellationRequested(async () => {
      await runnableScaScan.getCancelPromise();
      finalizeScanState(VscodeStates.ScaScanInProgress, true, progress);
    });

    const scanResult = await runnableScaScan.getResultPromise();
    const {result, stderr} = scanResult;
    if (validateCliCommonErrors(stderr)) {
      return;
    }
    validateCliCommonScanErrors(result);

    await handleScanDetections(result, params.diagnosticCollection, treeView);

    finalizeScanState(VscodeStates.ScaScanInProgress, true, progress);
  } catch (error) {
    finalizeScanState(VscodeStates.ScaScanInProgress, false, progress);

    extensionOutput.error('Error while creating scan: ' + error);
  }
};

const detectionsToDiagnostics = async (
    detections: ScaDetection[]
): Promise<Record<string, vscode.Diagnostic[]>> => {
  const result: Record<string, vscode.Diagnostic[]> = {};

  for (const detection of detections) {
    const {detection_details} = detection;
    const file_name = detection_details.file_name;
    const uri = vscode.Uri.file(file_name);
    const document = await vscode.workspace.openTextDocument(uri);

    let message = `Severity: ${detection.severity}\n`;
    message += `${detection.message}\n`;
    if (detection_details.alert?.first_patched_version) {
      message += `First patched version: ${detection_details.alert?.first_patched_version}\n`;
    }
    message += `Rule ID: ${detection.detection_rule_id}`;

    if (isSupportedLockFile(file_name)) {
      const packageFileName = getPackageFileForLockFile(path.basename(file_name));
      message += `\n\nAvoid manual packages upgrades in lock files. 
      Update the ${packageFileName} file and re-generate the lock file.`;
    }

    const diagnostic = new vscode.Diagnostic(
        // BE of SCA counts lines from 1, while VSCode counts from 0
        document.lineAt(detection_details.line_in_file - 1).range,
        message,
        vscode.DiagnosticSeverity.Error
    );

    diagnostic.source = extensionId;
    diagnostic.code = new DiagnosticCode(ScanType.Sca, detection.detection_rule_id).toString();

    result[file_name] = result[file_name] || [];
    result[file_name].push(diagnostic);
  }

  return result;
};

const handleScanDetections = async (
    result: any,
    diagnosticCollection: vscode.DiagnosticCollection,
    treeView?: TreeView
) => {
  const {detections} = result;

  const hasDetections = detections.length > 0;
  if (!hasDetections) {
    return;
  }

  setContext(VscodeStates.HasDetections, hasDetections);
  setContext(VscodeStates.TreeViewIsOpen, hasDetections);

  const diagnostics = await detectionsToDiagnostics(result.detections);

  // add the diagnostics to the diagnostic collection
  for (const [filePath, fileDiagnostics] of Object.entries(diagnostics)) {
    const uri = vscode.Uri.file(filePath);
    diagnosticCollection.set(uri, fileDiagnostics); // Show in "problems" tab
  }

  if (result.detections.length && !getWorkspaceState(VscodeStates.NotificationIsOpen)) {
    updateWorkspaceState(VscodeStates.NotificationIsOpen, true);
    TrayNotifications.showProblemsDetection(result.detections.length, ScanType.Sca);
  }

  refreshTreeViewData({
    detections,
    treeView,
    scanType: ScanType.Sca,
  });
};
