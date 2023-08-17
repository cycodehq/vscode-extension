import * as vscode from "vscode";
import { TreeViewItem } from "./item";
import { getSeverityIconPath, TREE_VIEW_TOP_LEVEL_ITEMS } from './constants';
import { ScanType } from '../../constants';
import { TreeViewDisplayedData } from './types';

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
      return Promise.resolve(TREE_VIEW_TOP_LEVEL_ITEMS);
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
          const {lineNumber, severityFirstLetter, type} = vulnerability;
          return new TreeViewItem(
            `line ${lineNumber}: ${type}`,
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
