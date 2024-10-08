import * as path from 'path';
import * as vscode from 'vscode';
import {cliWrapper} from '../../cli-wrapper/cli-wrapper';
import statusBar from '../../utils/status-bar';
import {StatusBarTexts, TrayNotificationTexts} from '../../utils/texts';
import {finalizeScanState, validateCliCommonErrors, validateCliCommonScanErrors} from '../common';
import {getWorkspaceState, updateWorkspaceState} from '../../utils/context';
import {SecretDetection} from '../../types/detection';
import {IConfig, ProgressBar, RunCliResult} from '../../cli-wrapper/types';
import {TreeView} from '../../providers/tree-view/types';
import {ScanType} from '../../constants';
import {VscodeStates} from '../../utils/states';
import {captureException} from '../../sentry';
import {handleScanResult} from './common';
import {container} from 'tsyringe';
import {ILoggerService} from '../LoggerService';
import {LoggerServiceSymbol} from '../../symbols';

interface SecretScanParams {
  pathToScan: string;
  workspaceFolderPath?: string;
  diagnosticCollection: vscode.DiagnosticCollection;
  config: IConfig;
  onDemand?: boolean;
}

export const secretScan = (params: SecretScanParams, treeView: TreeView) => {
  // we are showing progress bar only for on-demand scans
  if (!params.onDemand) {
    _secretScan(params, treeView, undefined, undefined);
    return;
  }

  vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        await _secretScan(params, treeView, progress, token);
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
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);
  logger.info(StatusBarTexts.ScanWait);
  logger.info('Initiating scan for file: ' + params.pathToScan);

  statusBar.showScanningInProgress();
  updateWorkspaceState(VscodeStates.SecretsScanInProgress, true);

  progress?.report({
    message: `Secrets scanning ${params.pathToScan}...`,
  });
};

export async function _secretScan(
    params: SecretScanParams,
    treeView: TreeView,
    progress?: ProgressBar,
    cancellationToken?: vscode.CancellationToken,
) {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);

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

    await handleScanResult(
        ScanType.Secrets,
        result,
        params.diagnosticCollection,
        treeView
    );

    finalizeScanState(VscodeStates.SecretsScanInProgress, true, progress);
  } catch (error: any) {
    captureException(error);

    finalizeScanState(VscodeStates.SecretsScanInProgress, false, progress);

    let notificationText: string = TrayNotificationTexts.ScanError;
    if (error.message !== undefined) {
      notificationText = `${TrayNotificationTexts.ScanError}. ${error.message}`;
    }
    vscode.window.showErrorMessage(notificationText);

    logger.error('Error while creating Secret scan: ' + error);
  }
}

interface SecretDetectionIdeData {
  documentPath: string;
  document: vscode.TextDocument;
  range: vscode.Range;
  value: string;
}

export const getSecretDetectionIdeData = async (detection: SecretDetection): Promise<SecretDetectionIdeData> => {
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
  const range = new vscode.Range(startPosition, endPosition);

  const value = document.getText(range);

  return {
    documentPath,
    document,
    range,
    value,
  };
};
