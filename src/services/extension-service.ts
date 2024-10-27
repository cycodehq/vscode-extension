import * as vscode from 'vscode';
import { singleton } from 'tsyringe';
import { refreshDiagnosticCollectionData } from '../providers/diagnostics/common';
import { TreeDataProvider } from '../providers/tree-data/provider';

export interface IExtensionService {
  extensionContext: vscode.ExtensionContext;
  diagnosticCollection: vscode.DiagnosticCollection;
  treeDataProvider: TreeDataProvider;
  refreshProviders(): Promise<void>;
}

@singleton()
export class ExtensionService implements IExtensionService {
  /*
   *The purpose of this class is to store global things of the extension.
   *It is a singleton, so it is shared across the extension.
   *It was developed for migration during huge refactoring.
   *I hope it will be removed in the future.
   */

  private _extensionContext?: vscode.ExtensionContext;
  private _diagnosticCollection?: vscode.DiagnosticCollection;
  private _treeDataProvider?: TreeDataProvider;

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

  get treeDataProvider(): TreeDataProvider {
    if (!this._treeDataProvider) {
      throw new Error('Tree view data provider is not initialized');
    }
    return this._treeDataProvider;
  }

  set treeDataProvider(value: TreeDataProvider) {
    this._treeDataProvider = value;
  }

  public async refreshProviders() {
    await refreshDiagnosticCollectionData(this.diagnosticCollection);
    this.treeDataProvider.refresh();
  }
}
