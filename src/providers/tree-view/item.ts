import * as vscode from "vscode";
import { ScanType } from '../../constants';
import { TreeViewDisplayedData } from './types';


interface TreeViewItemOptions {
  title: string;
  collapsibleState: vscode.TreeItemCollapsibleState;
  vulnerabilities?: TreeViewDisplayedData[];
  scanSectionType?: ScanType;
  customIconPath?: string;
  description?: string;
  fullFilePath?: string;
  command?: vscode.Command;
}

export class TreeViewItem extends vscode.TreeItem {
  public static readonly viewType = "scan.treeView";

  public scanSectionType: ScanType | undefined;
  public fullFilePath: string | undefined;
  public vulnerabilities: TreeViewDisplayedData[] | undefined;

  constructor(options: TreeViewItemOptions) {
    super(options.title, options.collapsibleState);

    // vscode
    this.tooltip = options.title;
    this.command = options.command;
    this.contextValue = options.scanSectionType;

    // custom
    this.scanSectionType = options.scanSectionType;
    this.fullFilePath = options.fullFilePath;
    this.vulnerabilities = options.vulnerabilities;

    if (options.customIconPath) {
      this.iconPath = {
        light: options.customIconPath,
        dark: options.customIconPath,
      };
    }

    if (options.description) {
      this.description = options.description;
    } else if (options.vulnerabilities) {
      this.description = `${options.vulnerabilities.length} vulnerabilities`;
    } else {
      this.description = "";
    }
  }
}
