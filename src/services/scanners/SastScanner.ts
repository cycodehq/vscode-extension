import * as vscode from 'vscode';
import {extensionOutput} from '../../logging/extension-output';
import {cliWrapper} from '../../cli-wrapper/cli-wrapper';
import statusBar from '../../utils/status-bar';
import {StatusBarTexts, TrayNotificationTexts} from '../../utils/texts';
import {
  finalizeScanState,
  validateCliCommonErrors,
  validateCliCommonScanErrors,
} from '../common';
import {getWorkspaceState, updateWorkspaceState} from '../../utils/context';
import {SastDetection} from '../../types/detection';
import {IConfig, ProgressBar, RunCliResult} from '../../cli-wrapper/types';
import {TreeView} from '../../providers/tree-view/types';
import {ScanType} from '../../constants';
import {VscodeStates} from '../../utils/states';
import {captureException} from '../../sentry';
import {handleScanResult} from './common';

interface SastScanParams {
  pathToScan: string;
  workspaceFolderPath?: string;
  diagnosticCollection: vscode.DiagnosticCollection;
  config: IConfig;
  onDemand?: boolean;
}

type SastScanResult = { detections?: SastDetection[] };

export const sastScan = (params: SastScanParams, treeView: TreeView) => {
  // we are showing progress bar only for on-demand scans
  if (!params.onDemand) {
    _sastScan(params, treeView, undefined, undefined);
    return;
  }

  vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        await _sastScan(params, treeView, progress, token);
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

const normalizeSastDetections = (result: SastScanResult): SastScanResult => {
  if (!result || !result.detections) {
    return {detections: []};
  }

  for (const detection of result.detections) {
    const {detection_details} = detection;

    if (!detection_details.file_path.startsWith('/')) {
      detection_details.file_path = '/' + detection_details.file_path;
    }
  }

  return {detections: result.detections};
};

export async function _sastScan(
    params: SastScanParams,
    treeView: TreeView,
    progress?: ProgressBar,
    cancellationToken?: vscode.CancellationToken,
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

    await handleScanResult(
        ScanType.Sast,
        normalizeSastDetections(result),
        params.diagnosticCollection,
        treeView
    );

    finalizeScanState(VscodeStates.SastScanInProgress, true, progress);
  } catch (error: any) {
    captureException(error);

    finalizeScanState(VscodeStates.SastScanInProgress, false, progress);

    let notificationText: string = TrayNotificationTexts.ScanError;
    if (error.message !== undefined) {
      notificationText = `${TrayNotificationTexts.ScanError}. ${error.message}`;
    }
    vscode.window.showErrorMessage(notificationText);

    extensionOutput.error('Error while creating SAST scan: ' + error);
  }
}
