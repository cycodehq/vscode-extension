import * as vscode from "vscode";
import { ScanType } from '../../constants';
import { TreeViewDisplayedData } from './types';


export class TreeViewItem extends vscode.TreeItem {
  public static readonly viewType = "scan.treeView";
  constructor(
    public readonly title: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly vulnerabilities?: TreeViewDisplayedData[],
    public readonly scanSectionType?: ScanType,
    public readonly customIconPath?: string,
  ) {
    super(title, collapsibleState);
    this.tooltip = `${this.title}`;
    this.contextValue = scanSectionType;

    if (customIconPath) {
      this.iconPath = {
        light: customIconPath,
        dark: customIconPath,
      };
    }
    this.description =
      this.vulnerabilities !== undefined
        ? `${this.vulnerabilities.length} vulnerabilities`
        : "";
  }
}
