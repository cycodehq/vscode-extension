import * as vscode from 'vscode';
import {TreeView} from './types';
import {TreeViewDataProvider} from './provider';
import {TreeViewItem} from './item';

export const createTreeView = (
    context: vscode.ExtensionContext
): TreeView => {
  const provider = new TreeViewDataProvider();
  const view = vscode.window.createTreeView(TreeViewItem.viewType, {
    treeDataProvider: provider,
    canSelectMany: true,
  });

  context.subscriptions.push(
      vscode.window.registerTreeDataProvider(
          TreeViewItem.viewType,
          provider
      )
  );
  return {view, provider};
};
