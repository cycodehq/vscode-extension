import * as vscode from 'vscode';
import {TreeItem} from './item';
import {
  getSectionItem,
  getSeverityIconPath,
  SECTIONS_ORDER,
} from './constants';
import {ScanType, SEVERITY_PRIORITIES_FIRST_LETTERS} from '../../constants';
import {TreeDisplayedData} from './types';
import {mapScanResultsToSeverityStatsString} from './utils';
import {VscodeCommands} from '../../commands';

type TreeDataDatabase = { [key: string]: FileScanResult[]};

export class FileScanResult {
  constructor(
    public fileName: string,
    public fullFilePath: string,
    public vulnerabilities: TreeDisplayedData[]
  ) {}
}

export class TreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    TreeItem | undefined | void
  > = new vscode.EventEmitter<TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    TreeItem | undefined | void
  > = this._onDidChangeTreeData.event;

  private filesScanResults: TreeDataDatabase = {
    [ScanType.Secrets]: [],
    [ScanType.Sca]: [],
    [ScanType.Sast]: [],
    [ScanType.Iac]: [],
  };

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(
      element?: TreeItem
  ): Thenable<TreeItem[]> {
    if (!element) {
      const treeTopLevelItems = [];
      for (const scanType of SECTIONS_ORDER) {
        const description = mapScanResultsToSeverityStatsString(this.filesScanResults[scanType]);
        treeTopLevelItems.push(getSectionItem(scanType, description));
      }
      return Promise.resolve(treeTopLevelItems);
    }

    if (element.scanSectionType) {
      const scanResults = this.filesScanResults[element.scanSectionType];

      return Promise.resolve(
          scanResults.map(
              (scanResult) =>
                new TreeItem({
                  title: scanResult.fileName,
                  collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                  vulnerabilities: scanResult.vulnerabilities,
                  fullFilePath: scanResult.fullFilePath,
                  contextValue: `${element.contextValue}-file`,
                })
          )
      );
    }

    if (element.vulnerabilities) {
      return Promise.resolve(_createSeveritySortedTreeItems(element));
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

const _mapSeverityToDisplayedData =
  (treeDisplayedData: TreeDisplayedData[]): { [key: string]: TreeDisplayedData[] } => {
    const severityToDisplayData: { [key: string]: TreeDisplayedData[] } = {};
    for (const displayedData of treeDisplayedData) {
      const {severityFirstLetter} = displayedData;
      if (!(severityFirstLetter in severityToDisplayData)) {
        severityToDisplayData[severityFirstLetter] = [displayedData];
      } else {
        severityToDisplayData[severityFirstLetter].push(displayedData);
      }
    }

    return severityToDisplayData;
  };


const _createSeveritySortedTreeItems = (treeItem: TreeItem): TreeItem[] => {
  if (!treeItem.vulnerabilities) {
    return [];
  }

  const severityToDisplayData = _mapSeverityToDisplayedData(treeItem.vulnerabilities);

  const sortedVulnerabilities: TreeItem[] = [];
  SEVERITY_PRIORITIES_FIRST_LETTERS.forEach((severityFirstLetter) => {
    const vulnerabilitiesOfSeverity = severityToDisplayData[severityFirstLetter];
    vulnerabilitiesOfSeverity && vulnerabilitiesOfSeverity.forEach((vulnerability) => {
      const openFileCommand: vscode.Command = {
        command: VscodeCommands.OnTreeItemClick,
        title: '',
        arguments: [treeItem.fullFilePath, vulnerability],
      };

      sortedVulnerabilities.push(new TreeItem({
        title: vulnerability.title,
        vulnerability: vulnerability,
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        customIconPath: getSeverityIconPath(severityFirstLetter),
        fullFilePath: treeItem.fullFilePath,
        command: openFileCommand,
        contextValue: `${treeItem.contextValue}-vulnerability`,
      }));
    });
  });

  return sortedVulnerabilities;
};