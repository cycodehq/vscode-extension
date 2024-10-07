import * as vscode from 'vscode';
import {config, validateConfig} from '../utils/config';
import {iacScan} from '../services/scanners/IacScanner';
import {container} from 'tsyringe';
import {IExtensionService} from '../services/ExtensionService';
import {ExtensionServiceSymbol} from '../symbols';

export default () => {
  if (validateConfig()) {
    return;
  }

  const projectPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!projectPath) {
    return;
  }

  const extension = container.resolve<IExtensionService>(ExtensionServiceSymbol);

  iacScan(
      {
        config,
        pathToScan: projectPath,
        workspaceFolderPath: projectPath,
        diagnosticCollection: extension.diagnosticCollection,
        onDemand: true,
      },
      extension.treeView,
  );
};