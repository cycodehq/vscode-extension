import * as vscode from 'vscode';
import { TreeView } from './types';
import { TreeDataProvider } from './provider';
import { TreeItem } from './item';

export const createTreeView = (context: vscode.ExtensionContext): TreeView => {
  const provider = new TreeDataProvider();
  const view = vscode.window.createTreeView(TreeItem.viewType, {
    treeDataProvider: provider,
    canSelectMany: true,
  });

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      TreeItem.viewType,
      provider,
    ),
  );
  return { view, provider };
};
