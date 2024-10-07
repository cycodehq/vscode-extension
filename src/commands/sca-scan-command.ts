import * as vscode from 'vscode';
import {config, validateConfig} from '../utils/config';
import {scaScan} from '../services/scanners/ScaScanner';
import {container} from 'tsyringe';
import {IExtensionService} from '../services/ExtensionService';
import {ExtensionServiceSymbol} from '../symbols';

export default () => {
  if (validateConfig()) {
    return;
  }

  const extension = container.resolve<IExtensionService>(ExtensionServiceSymbol);

  // iterate over workspace folders and scan each one
  // FIXME(MarshalX): do we actually want to scan all the workspace folders?
  //  why not only active one?
  //  why it waits each scan result?
  //  it take too long
  for (const workspaceFolder of vscode.workspace.workspaceFolders || []) {
    scaScan(
        {
          config,
          pathToScan: workspaceFolder.uri.fsPath,
          workspaceFolderPath: workspaceFolder.uri.fsPath,
          diagnosticCollection: extension.diagnosticCollection,
          onDemand: true,
        },
        extension.treeView,
    );
  }
};
