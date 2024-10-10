import * as vscode from 'vscode';

import {cliWrapper} from '../cli-wrapper/cli-wrapper';
import statusBar from '../utils/status-bar';
import {validateCliCommonErrors} from './common';
import {IConfig} from '../cli-wrapper/types';
import {IgnoreCommandConfig} from '../types/commands';
import {secretScan} from './scanners/secret-scanner';
import TrayNotifications from '../utils/tray-notifications';
import {TreeView} from '../providers/tree-data/types';
import {CommandParameters} from '../cli-wrapper/constants';
import {isSupportedIacFile} from '../constants';
import {iacScan} from './scanners/iac-scanner';
import {captureException} from '../sentry';
import {container} from 'tsyringe';
import {ILoggerService} from './logger-service';
import {LoggerServiceSymbol} from '../symbols';

export async function ignore(
    params: {
      workspaceFolderPath?: string;
      config: IConfig;
      ignoreConfig: IgnoreCommandConfig;
      diagnosticCollection: vscode.DiagnosticCollection;
      treeView: TreeView;
    }
) {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);

  try {
    const {stderr, exitCode} = await cliWrapper.getRunnableIgnoreCommand(params).getResultPromise();

    if (validateCliCommonErrors(stderr)) {
      return;
    }

    // throw error
    if (exitCode !== 0) {
      throw new Error(stderr);
    }

    const filePath = params.ignoreConfig.filePath;
    const fileUri = vscode.Uri.file(filePath);

    onIgnoreComplete();
    if (params.ignoreConfig.ignoreBy === CommandParameters.ByPath) {
      params.diagnosticCollection.delete(fileUri);
      params.treeView.provider.excludeViolationsByPath(params.ignoreConfig.param);
      return;
    }

    // FIXME(MarshalX): implement local excluding for rule and value!

    // start rescan to visualize the applied "ignore" action
    // TODO(MarshalX): could be not only Secret scan type...
    const secretScanParams = {
      pathToScan: filePath,
      workspaceFolderPath: params.workspaceFolderPath,
      diagnosticCollection: params.diagnosticCollection,
      config: params.config,
    };
    secretScan(secretScanParams, params.treeView);

    if (isSupportedIacFile(filePath)) {
      const iacScanParams = {
        config: params.config,
        pathToScan: filePath,
        workspaceFolderPath: params.workspaceFolderPath,
        diagnosticCollection: params.diagnosticCollection,
      };
      iacScan(iacScanParams, params.treeView);
    }
  } catch (error) {
    captureException(error);
    logger.error(`Error while ignoring: ${error}`);
    onIgnoreFailed();
  }
}

export function onIgnoreFailed() {
  TrayNotifications.showIgnoreFailed();
}

export function onIgnoreComplete() {
  TrayNotifications.showIgnoreSuccess();
  statusBar.showDefault();
}
