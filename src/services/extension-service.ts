import * as vscode from 'vscode';
import { container, singleton } from 'tsyringe';
import { refreshDiagnosticCollectionData } from '../providers/diagnostics/common';
import { IStateService } from './state-service';
import { ScanResultsServiceSymbol, StateServiceSymbol } from '../symbols';
import { IScanResultsService } from './scan-results-service';
import { CliScanType } from '../cli/models/cli-scan-type';
import { TreeDataProvider } from '../providers/tree-data/provider';

export interface IExtensionService {
  extensionContext: vscode.ExtensionContext;
  diagnosticCollection: vscode.DiagnosticCollection;
  treeDataProvider: TreeDataProvider;
  refreshProviders(scanType: CliScanType): Promise<void>;
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

  private refreshDetectionsLocalState(scanType: CliScanType) {
    const stateService = container.resolve<IStateService>(StateServiceSymbol);
    const scanResultsService = container.resolve<IScanResultsService>(ScanResultsServiceSymbol);

    const scanTypeDetections = scanResultsService.getDetections(scanType);
    const hasDetections = scanTypeDetections.length > 0;
    if (hasDetections) {
      stateService.localState.TreeViewIsOpen = true;
    }

    stateService.localState.HasAnyDetections = scanResultsService.hasResults();
    stateService.save();
  }

  public async refreshProviders(scanType: CliScanType) {
    this.refreshDetectionsLocalState(scanType);
    await refreshDiagnosticCollectionData(this.diagnosticCollection);
    this.treeDataProvider.refresh();
  }
}
