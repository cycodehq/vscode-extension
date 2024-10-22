import * as vscode from 'vscode';
import { TreeDataProvider } from './provider';
import { BaseNode } from './nodes/base-node';

export interface TreeView {
  provider: TreeDataProvider;
  view: vscode.TreeView<BaseNode>;
}

export const createTreeView = (context: vscode.ExtensionContext): TreeView => {
  const provider = new TreeDataProvider();
  const view = vscode.window.createTreeView(TreeDataProvider.viewType, {
    treeDataProvider: provider,
    showCollapseAll: true,
    canSelectMany: false,
  });

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      TreeDataProvider.viewType,
      provider,
    ),
  );
  return { view, provider };
};
