import * as vscode from "vscode";
import { TreeViewItem } from "./item";
import { getSectionItem, getSeverityIconPath, SECTIONS_ORDER, SEVERITY_PRIORITIES } from './constants';
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
      for (const scanType of SECTIONS_ORDER) {
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
      return Promise.resolve(_createSeveritySortedTreeViewItems(element.vulnerabilities));
    }

    return Promise.resolve([]);
  }

  refresh(filesScanResults: FileScanResult[], scanType: ScanType): void {
    this.filesScanResults[scanType] = filesScanResults;
    this._onDidChangeTreeData.fire();
  }
}

const _mapSeverityToDisplayedData = (treeViewDisplayedData: TreeViewDisplayedData[]): { [key: string]: TreeViewDisplayedData[] } => {
  const severityToDisplayData: { [key: string]: TreeViewDisplayedData[] } = {};
  for (const displayedData of treeViewDisplayedData) {
    const { severityFirstLetter } = displayedData;
    if (!severityToDisplayData.hasOwnProperty(severityFirstLetter)) {
      severityToDisplayData[severityFirstLetter] = [displayedData];
    } else {
      severityToDisplayData[severityFirstLetter].push(displayedData);
    }
  }

  return severityToDisplayData;
};


const _createSeveritySortedTreeViewItems = (vulnerabilities: TreeViewDisplayedData[]): TreeViewItem[] => {
  const severityToDisplayData = _mapSeverityToDisplayedData(vulnerabilities);

  const sortedVulnerabilities: TreeViewItem[] = [];
  SEVERITY_PRIORITIES.forEach((severityFirstLetter) => {
    const vulnerabilitiesOfSeverity = severityToDisplayData[severityFirstLetter];
    vulnerabilitiesOfSeverity && vulnerabilitiesOfSeverity.forEach((vulnerability) => {
      sortedVulnerabilities.push(new TreeViewItem(
        vulnerability.title,
        vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        getSeverityIconPath(severityFirstLetter),
      ));
    });
  });

  return sortedVulnerabilities;
};
