import * as vscode from 'vscode';
import TrayNotifications from '../utils/tray-notifications';
import {config, validateConfig} from '../utils/config';
import {sastScan} from '../services/scanners/sast-scanner';
import {container} from 'tsyringe';
import {IExtensionService} from '../services/extension-service';
import {ExtensionServiceSymbol} from '../symbols';

export default () => {
  // scan the current open document if opened

  if (!vscode.window.activeTextEditor?.document ||
          vscode.window?.activeTextEditor?.document?.uri.scheme === 'output'
  ) {
    TrayNotifications.showMustBeFocusedOnFile();

    return;
  }

  if (validateConfig()) {
    return;
  }

  const extension = container.resolve<IExtensionService>(ExtensionServiceSymbol);

  sastScan(
      {
        config,
        pathToScan: vscode.window.activeTextEditor.document.fileName,
        workspaceFolderPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        diagnosticCollection: extension.diagnosticCollection,
        onDemand: true,
      },
      extension.treeView,
  );
};
