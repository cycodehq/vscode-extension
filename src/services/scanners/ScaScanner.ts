import * as vscode from 'vscode';
import {cliWrapper} from '../../cli-wrapper/cli-wrapper';
import statusBar from '../../utils/status-bar';
import {StatusBarTexts} from '../../utils/texts';
import {finalizeScanState, validateCliCommonErrors, validateCliCommonScanErrors} from '../common';
import {getWorkspaceState, updateWorkspaceState} from '../../utils/context';
import {IConfig, ProgressBar, RunCliResult} from '../../cli-wrapper/types';
import {TreeView} from '../../providers/tree-view/types';
import {ScanType} from '../../constants';
import {VscodeStates} from '../../utils/states';
import {captureException} from '../../sentry';
import {handleScanResult} from './common';
import {container} from 'tsyringe';
import {ILoggerService} from '../LoggerService';
import {LoggerServiceSymbol} from '../../symbols';

interface ScaScanParams {
  pathToScan: string;
  workspaceFolderPath?: string;
  diagnosticCollection: vscode.DiagnosticCollection;
  config: IConfig;
  onDemand?: boolean;
}

export function scaScan(params: ScaScanParams, treeView: TreeView) {
  if (getWorkspaceState(VscodeStates.ScaScanInProgress)) {
    return;
  }

  if (!params.onDemand) {
    _scaScan(params, treeView, undefined, undefined);
    return;
  }

  vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        await _scaScan(params, treeView, progress, token);
      },
  );
}

const _initScanState = (params: ScaScanParams, progress?: ProgressBar) => {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);

  logger.info(StatusBarTexts.ScanWait);
  logger.info('Initiating SCA scan for path: ' + params.workspaceFolderPath);

  statusBar.showScanningInProgress();

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
    treeView: TreeView,
    progress?: ProgressBar,
    cancellationToken?: vscode.CancellationToken,
) => {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);

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

    await handleScanResult(ScanType.Sca, result, params.diagnosticCollection, treeView);

    finalizeScanState(VscodeStates.ScaScanInProgress, true, progress);
  } catch (error) {
    captureException(error);

    finalizeScanState(VscodeStates.ScaScanInProgress, false, progress);

    logger.error('Error while creating SCA scan: ' + error);
  }
};
