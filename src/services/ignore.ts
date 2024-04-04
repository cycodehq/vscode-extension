import * as vscode from 'vscode';

import {extensionOutput} from '../logging/extension-output';
import {cliWrapper} from '../cli-wrapper/cli-wrapper';
import statusBar from '../utils/status-bar';
import {validateCliCommonErrors} from './common';
import {IConfig} from '../cli-wrapper/types';
import {IgnoreCommandConfig} from '../types/commands';
import {secretScan} from './scanners/SecretScanner';
import TrayNotifications from '../utils/TrayNotifications';
import {TreeView} from '../providers/tree-view/types';
import {CommandParameters} from '../cli-wrapper/constants';
import {isSupportedIacFile} from '../constants';
import {iacScan} from './scanners/IacScanner';

export async function ignore(
    params: {
      documentInitiatedIgnore: vscode.TextDocument;
      workspaceFolderPath?: string;
      config: IConfig;
      ignoreConfig: IgnoreCommandConfig;
      diagnosticCollection: vscode.DiagnosticCollection;
      treeView: TreeView;
    }
) {
  try {
    const {stderr, exitCode} = await cliWrapper.getRunnableIgnoreCommand(params).getResultPromise();

    if (validateCliCommonErrors(stderr)) {
      return;
    }

    // throw error
    if (exitCode !== 0) {
      throw new Error(stderr);
    }

    onIgnoreComplete();
    if (params.ignoreConfig.ignoreBy === CommandParameters.ByPath) {
      params.diagnosticCollection.delete(params.documentInitiatedIgnore.uri);
      params.treeView.provider.excludeViolationsByPath(params.ignoreConfig.param);
      return;
    }

    // FIXME(MarshalX): implement local excluding for rule and value!

    // start rescan to visualize the applied "ignore" action
    // TODO(MarshalX): could be not only Secret scan type...
    const secretScanParams = {
      pathToScan: params.documentInitiatedIgnore.fileName,
      workspaceFolderPath: params.workspaceFolderPath,
      diagnosticCollection: params.diagnosticCollection,
      config: params.config,
    };
    secretScan(secretScanParams, params.treeView);

    if (isSupportedIacFile(params.documentInitiatedIgnore.fileName)) {
      const iacScanParams = {
        config: params.config,
        pathToScan: params.documentInitiatedIgnore.fileName,
        workspaceFolderPath: params.workspaceFolderPath,
        diagnosticCollection: params.diagnosticCollection,
      };
      iacScan(iacScanParams, params.treeView);
    }
  } catch (error) {
    extensionOutput.error('Error while ignoring: ' + error);
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
