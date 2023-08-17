import * as vscode from "vscode";
import { TreeViewItem } from "./item";
import { getSectionItem, getSeverityIconPath } from './constants';
import { ScanType } from '../../constants';
import { TreeViewDisplayedData } from './types';
import { mapScanResultsToSeverityStatsString } from './utils';

type TreeDataDatabase = { [key:string]: FileScanResult[]};

export class FileScanResult {
  constructor(
    public fileName: string,
    public vulnerabilities: TreeViewDisplayedData[]
  ) {}
}

export class TreeViewDataProvider
  implements vscode.TreeDataProvider<TreeViewItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    TreeViewItem | undefined | void
  > = new vscode.EventEmitter<TreeViewItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    TreeViewItem | undefined | void
  > = this._onDidChangeTreeData.event;

  // order of keys is important. represents the order of the sections in the tree view
  private filesScanResults: TreeDataDatabase = {
    [ScanType.Secrets]: [],
    [ScanType.Sca]: [],
    [ScanType.Sast]: [],
    [ScanType.Iac]: [],
  };

  getTreeItem(element: TreeViewItem): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: TreeViewItem
  ): Thenable<TreeViewItem[]> {
    if (!element) {
      const treeViewTopLevelItems = [];
      for (const scanType of Object.keys(this.filesScanResults)) {
        const description = mapScanResultsToSeverityStatsString(this.filesScanResults[scanType]);
        treeViewTopLevelItems.push(getSectionItem(scanType, description));
      }
      return Promise.resolve(treeViewTopLevelItems);
    }

    if (element.scanSectionType) {
      const scanResults = this.filesScanResults[element.scanSectionType];

      return Promise.resolve(
        scanResults.map(
          (scanResult) =>
            new TreeViewItem(
              scanResult.fileName,
              vscode.TreeItemCollapsibleState.Collapsed,
              scanResult.vulnerabilities,
            )
        )
      );
    }

    if (element.vulnerabilities) {
      return Promise.resolve(
        (element.vulnerabilities || []).map((vulnerability) => {
          const {title, severityFirstLetter} = vulnerability;
          return new TreeViewItem(
            title,
            vscode.TreeItemCollapsibleState.None,
            undefined,
            undefined,
            getSeverityIconPath(severityFirstLetter),
          );
        })
      );
    }

    return Promise.resolve([]);
  }

  refresh(filesScanResults: FileScanResult[], scanType: ScanType): void {
    this.filesScanResults[scanType] = filesScanResults;
    this._onDidChangeTreeData.fire();
  }
}
