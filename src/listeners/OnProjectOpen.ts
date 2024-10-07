import * as vscode from 'vscode';
import {config, validateConfig} from '../utils/config';
import {scaScan} from '../services/scanners/ScaScanner';
import {container} from 'tsyringe';
import {IExtensionService} from '../services/ExtensionService';
import {ExtensionServiceSymbol} from '../symbols';

export const OnProjectOpen = () => {
  // right now it only starts sca scan on project open

  const scaScanOnOpen = false;
  if (!scaScanOnOpen) {
    return;
  }

  // sca scan
  if (validateConfig()) {
    return;
  }

  const workspaceFolderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  // we should run sca scan only if the project is open!
  if (!workspaceFolderPath) {
    return;
  }

  const extension = container.resolve<IExtensionService>(ExtensionServiceSymbol);

  scaScan(
      {
        config,
        pathToScan: workspaceFolderPath,
        workspaceFolderPath,
        diagnosticCollection: extension.diagnosticCollection,
      },
      extension.treeView,
  );
};
