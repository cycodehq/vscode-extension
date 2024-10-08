import * as vscode from 'vscode';
import {singleton} from 'tsyringe';
import {TreeView} from '../providers/tree-view/types';

export interface IExtensionService {
  extensionContext: vscode.ExtensionContext;
  diagnosticCollection: vscode.DiagnosticCollection;
  treeView: TreeView;
}

@singleton()
export class ExtensionService implements IExtensionService {
  /*
  The purpose of this class is to store global things of the extension.
  It is a singleton, so it is shared across the extension.
  It was developed for migration during huge refactoring.
  I hope it will be removed in the future.
   */
  private _extensionContext?: vscode.ExtensionContext;
  private _diagnosticCollection?: vscode.DiagnosticCollection;
  private _treeView?: TreeView;

  get extensionContext(): vscode.ExtensionContext {
    if (!this._extensionContext) {
      throw new Error('Extension context is not initialized');
    }
    return this._extensionContext;
  }

  set extensionContext(value: vscode.ExtensionContext) {
    this._extensionContext = value;
  }

  get diagnosticCollection(): vscode.DiagnosticCollection {
    if (!this._diagnosticCollection) {
      throw new Error('Diagnostic collection is not initialized');
    }
    return this._diagnosticCollection;
  }

  set diagnosticCollection(value: vscode.DiagnosticCollection) {
    this._diagnosticCollection = value;
  }

  get treeView(): TreeView {
    if (!this._treeView) {
      throw new Error('Tree view is not initialized');
    }
    return this._treeView;
  }

  set treeView(value: TreeView) {
    this._treeView = value;
  }
}
