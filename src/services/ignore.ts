import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { cliWrapper } from '../cli/cli-wrapper';
import statusBar from '../utils/status-bar';
import { validateCliCommonErrors } from './common';
import { IConfig } from '../cli/types';
import { IgnoreCommandConfig } from '../types/commands';
import TrayNotifications from '../utils/tray-notifications';
import { TreeView } from '../providers/tree-data/types';
import { CommandParameters } from '../cli/constants';
import { isSupportedIacFile, ScanType } from '../constants';
import { captureException } from '../sentry';
import { ILoggerService } from './logger-service';
import { LoggerServiceSymbol } from '../symbols';
import { CycodeService, ICycodeService } from './cycode-service';

export async function ignore(
  params: {
    workspaceFolderPath?: string;
    config: IConfig;
    ignoreConfig: IgnoreCommandConfig;
    diagnosticCollection: vscode.DiagnosticCollection;
    treeView: TreeView;
  },
) {
  const logger = container.resolve<ILoggerService>(LoggerServiceSymbol);

  try {
    const { stderr, exitCode } = await cliWrapper.getRunnableIgnoreCommand(params).getResultPromise();

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

    /*
     * start rescan to visualize the applied "ignore" action
     * TODO(MarshalX): could be not only Secret scan type...
     */
    const cycodeService = container.resolve<ICycodeService>(CycodeService);
    void cycodeService.startScan(ScanType.Secret, [filePath], false);

    if (isSupportedIacFile(filePath)) {
      void cycodeService.startScan(ScanType.Iac, [filePath], false);
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
