import * as vscode from "vscode";
import { TreeViewItem } from "./item";
import {
  getSectionItem,
  getSeverityIconPath,
  SECTIONS_ORDER,
  SEVERITY_PRIORITIES_FIRST_LETTERS
} from './constants';
import { ScanType } from '../../constants';
import { TreeViewDisplayedData } from './types';
import { mapScanResultsToSeverityStatsString } from './utils';
import { VscodeCommands } from '../../utils/commands';

type TreeDataDatabase = { [key:string]: FileScanResult[]};

export class FileScanResult {
  constructor(
    public fileName: string,
    public fullFilePath: string,
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
            new TreeViewItem({
              title: scanResult.fileName,
              collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
              vulnerabilities: scanResult.vulnerabilities,
              fullFilePath: scanResult.fullFilePath,
            })
        )
      );
    }

    if (element.vulnerabilities) {
      return Promise.resolve(_createSeveritySortedTreeViewItems(element));
    }

    return Promise.resolve([]);
  }

  refresh(filesScanResults: FileScanResult[], scanType: ScanType): void {
    this.filesScanResults[scanType] = filesScanResults;
    this._onDidChangeTreeData.fire();
  }

  excludeViolationsByPath(path: string): void {
    for (const scanType of SECTIONS_ORDER) {
      const scanResults = this.filesScanResults[scanType];
      this.filesScanResults[scanType] = scanResults.filter(
        (scanResult) => scanResult.fullFilePath !== path
      );
    }

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


const _createSeveritySortedTreeViewItems = (treeViewItem: TreeViewItem): TreeViewItem[] => {
  if (!treeViewItem.vulnerabilities) {
    return [];
  }

  const severityToDisplayData = _mapSeverityToDisplayedData(treeViewItem.vulnerabilities);

  const sortedVulnerabilities: TreeViewItem[] = [];
  SEVERITY_PRIORITIES_FIRST_LETTERS.forEach((severityFirstLetter) => {
    const vulnerabilitiesOfSeverity = severityToDisplayData[severityFirstLetter];
    vulnerabilitiesOfSeverity && vulnerabilitiesOfSeverity.forEach((vulnerability) => {
      const openFileCommand: vscode.Command = {
        command: VscodeCommands.OpenViolationInFile,
        title: '',
        arguments: [treeViewItem.fullFilePath, vulnerability.lineNumber],
      };

      sortedVulnerabilities.push(new TreeViewItem({
        title: vulnerability.title,
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        customIconPath: getSeverityIconPath(severityFirstLetter),
        command: openFileCommand
      }));
    });
  });

  return sortedVulnerabilities;
};
