import * as vscode from 'vscode';
import { TreeDataProvider } from './provider';

export const createTreeDataProvider = (context: vscode.ExtensionContext): TreeDataProvider => {
  const treeDataProvider = new TreeDataProvider();
  treeDataProvider.treeView = vscode.window.createTreeView(
    TreeDataProvider.viewType, { treeDataProvider: treeDataProvider },
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      TreeDataProvider.viewType,
      treeDataProvider,
    ),
  );

  // it will create empty root nodes
  treeDataProvider.refresh();

  return treeDataProvider;
};
