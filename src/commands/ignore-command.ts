import * as vscode from 'vscode';
import {IgnoreCommandConfig} from '../types/commands';
import {config, validateConfig} from '../utils/config';
import {ignore} from '../services/ignore';
import {container} from 'tsyringe';
import {IExtensionService} from '../services/ExtensionService';
import {ExtensionServiceSymbol} from '../symbols';

export default async (ignoreConfig: IgnoreCommandConfig) => {
  if (validateConfig()) {
    return;
  }

  const extension = container.resolve<IExtensionService>(ExtensionServiceSymbol);

  await ignore({
    config,
    workspaceFolderPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
    ignoreConfig,
    diagnosticCollection: extension.diagnosticCollection,
    treeView: extension.treeView,
  });
};

