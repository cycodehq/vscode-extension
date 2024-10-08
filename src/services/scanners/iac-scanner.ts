import * as vscode from 'vscode';
import {cliWrapper} from '../../cli-wrapper/cli-wrapper';
import statusBar from '../../utils/status-bar';
import {StatusBarTexts, TrayNotificationTexts} from '../../utils/texts';
import {
  finalizeScanState,
  validateCliCommonErrors,
  validateCliCommonScanErrors,
} from '../common';
import {getWorkspaceState, updateWorkspaceState} from '../../utils/context';
import {IacDetection} from '../../types/detection';
import {IConfig, ProgressBar, RunCliResult} from '../../cli-wrapper/types';
import {TreeView} from '../../providers/tree-data/types';
import {ScanType} from '../../constants';
import {VscodeStates} from '../../utils/states';
import {captureException} from '../../sentry';
import {handleScanResult} from './common';
import * as fs from 'node:fs';
import {container} from 'tsyringe';
import {ILoggerService} from '../logger-service';
import {LoggerServiceSymbol} from '../../symbols';

interface IacScanParams {
  pathToScan: string;
  workspaceFolderPath?: string;
  diagnosticCollection: vscode.DiagnosticCollection;
  config: IConfig;
  onDemand?: boolean;
}

type IacScanResult = { detections?: IacDetection[] };

export const iacScan = (params: IacScanParams, treeView: TreeView) => {
  // we are showing progress bar only for on-demand scans
  if (!params.onDemand) {
    _iacScan(params, treeView, undefined, undefined);
    return;
  }

  vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        await _iacScan(params, treeView, progress, token);
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
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);
  logger.info(StatusBarTexts.ScanWait);
  logger.info('Initiating IaC scan for file: ' + params.pathToScan);

  statusBar.showScanningInProgress();
  updateWorkspaceState(VscodeStates.IacScanInProgress, true);

  progress?.report({
    message: `IaC scanning ${params.pathToScan}...`,
  });
};

const filterUnsupportedIacDetections = (result: IacScanResult): IacScanResult => {
  if (!result || !result.detections) {
    return result;
  }

  result.detections = result.detections.filter((detection) => {
    // TF plans are virtual files what is not exist in the file system
    // "file_name": "1711298252-/Users/ilyasiamionau/projects/cycode/ilya-siamionau-payloads/tfplan.tf",
    // skip such detections
    return fs.existsSync(detection.detection_details.file_name);
  });

  return result;
};

export async function _iacScan(
    params: IacScanParams,
    treeView: TreeView,
    progress?: ProgressBar,
    cancellationToken?: vscode.CancellationToken,
) {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);

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

    await handleScanResult(
        ScanType.Iac,
        filterUnsupportedIacDetections(result),
        params.diagnosticCollection,
        treeView
    );

    finalizeScanState(VscodeStates.IacScanInProgress, true, progress);
  } catch (error: any) {
    captureException(error);

    finalizeScanState(VscodeStates.IacScanInProgress, false, progress);

    let notificationText: string = TrayNotificationTexts.ScanError;
    if (error.message !== undefined) {
      notificationText = `${TrayNotificationTexts.ScanError}. ${error.message}`;
    }
    vscode.window.showErrorMessage(notificationText);

    logger.error('Error while creating IaC scan: ' + error);
  }
}
