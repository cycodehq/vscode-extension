import * as vscode from 'vscode';
import {config, validateConfig} from '../utils/config';
import {scaScan} from '../services/scanners/sca-scanner';
import {container} from 'tsyringe';
import {IExtensionService} from '../services/extension-service';
import {ExtensionServiceSymbol, StateServiceSymbol} from '../symbols';
import {IStateService} from '../services/state-service';

export const OnProjectOpen = () => {
  // dead code
  // was disabled because of slow scanning performance
  // right now it only starts sca scan on project open
  const stateService = container.resolve<IStateService>(StateServiceSymbol);

  if (!stateService.globalState.CliAuthed) {
    return;
  }

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
